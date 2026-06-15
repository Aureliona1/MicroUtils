const args = Deno.args;

if (!args.length) {
	console.error("Please provide a command to run for all subdirs!");
	Deno.exit(-1);
}

async function r(dir: string) {
	// Run command
	const pwd = Deno.cwd();
	Deno.chdir(dir);
	await new Deno.Command(args[0], { args: args.slice(1) }).output();
	Deno.chdir(pwd);

	for await (const e of Deno.readDir(dir)) {
		if (e.isDirectory) await r(dir + "/" + e.name);
	}
}

await r("./");
