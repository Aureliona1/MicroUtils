import { clog } from "jsr:@aurellis/helpers@1.4.3";
import { expandGlob } from "jsr:@std/fs@1.0.19";

// Lib

export type Config = {
	version: string;
	tasks: Record<
		string,
		{
			desc?: string;
			cmd: string | string[];
			watch?: string | string[];
		}
	>;
};

// Main

const args = Deno.args;

if (!args.length) {
	clog("Please provide the name of a task to run!", "Error", "TMON");
	Deno.exit(-1);
}

let cfgRaw = "{}";
try {
	cfgRaw = await Deno.readTextFile("tmon.json");
} catch (e) {
	clog(e, "Error", "Deno.readTextFile");
	clog("Could not read tmon config file...", "Error", "TMON");
	Deno.exit(-1);
}
let config: Config = { version: "1.0.0", tasks: {} };
try {
	config = JSON.parse(cfgRaw);
} catch (e) {
	clog(e, "Error", "JSON");
	clog("Error parsing JSON contents of tmon file...", "Error", "TMON");
	Deno.exit(-1);
}

if (!(args[0] in config.tasks)) {
	clog(`Task ${args[0]} does not exist in the config...`, "Error", "TMON");
	Deno.exit(-1);
}

const task = config.tasks[args[0]];

// Runner

clog(`Running task: ${args[0]}`, "Log", "TMON");
if (task.desc) {
	clog(task.desc, "Log", args[0]);
}
const cmds = typeof task.cmd == "string" ? [task.cmd] : task.cmd;
let debounce = false;
let currentChild: Deno.ChildProcess | null = null;
let running = false;

async function run(repeat = true) {
	// Kill the old process if we are interrupting something.
	if (running && currentChild) {
		clog("Restarting due to changes...", "Log", "TMON");
		currentChild.kill();
	} else {
		clog("Starting task...", "Log", "TMON");
	}

	// Sequentially run new tasks.
	for (const cmd of cmds) {
		const tokens = cmd.split(" ");
		currentChild = new Deno.Command(tokens[0], { args: tokens.slice(1) }).spawn();
		running = true;

		currentChild.status.then(status => {
			running = false;
			return status;
		});

		try {
			const output = await currentChild.output();
			running = false;

			if (output.code) {
				clog(`Process failed with exit code: ${output.code}`, "Error", "TMON");
				break;
			}
		} catch (err) {
			running = false;
			clog(`Process error: ${err}`, "Error", "TMON");
			break;
		}
	}
	if (repeat) {
		clog("Task complete, waiting for changes...", "Log", "TMON");
	} else {
		clog("Task complete...", "Log", "TMON");
	}
}

// Watch

if (!task.watch) {
	await run(false);
	Deno.exit(0);
}

const watcher = Deno.watchFs("./");
clog(`Watching paths: ${task.watch}`, "Log", "TMON");
await run();
// Watcher loop

for await (const event of watcher) {
	// Validate event
	const paths: string[] = [];
	const watchPaths = typeof task.watch == "string" ? [task.watch] : task.watch;
	for (const p of watchPaths) {
		for await (const file of expandGlob(p)) {
			paths.push(file.path);
		}
	}

	if (!event.paths.some(p => paths.includes(p.replaceAll("./", "")))) {
		continue;
	}

	// Debounce
	switch (event.kind) {
		case "any": {
			if (debounce) {
				debounce = false;
				continue;
			}
			debounce = true;
			break;
		}
		case "access": {
			continue;
		}
		case "create": {
			break;
		}
		case "modify": {
			if (debounce) {
				debounce = false;
				continue;
			}
			debounce = true;
			break;
		}
		case "rename": {
			break;
		}
		case "remove": {
			break;
		}
		case "other": {
			break;
		}
	}

	await run();
}
