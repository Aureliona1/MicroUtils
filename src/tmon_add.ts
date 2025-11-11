import { clog, ensureFile } from "jsr:@aurellis/helpers@^1.4.3";
import { Config } from "./tmon.ts";

const args = Deno.args;
if (args.length < 2) {
	clog("To add a task to TMON, run as such...", "Error", "tmon_add");
	clog("tmon_add <task_name> <command> <watch_path?>", "Log", "tmon_add");
	Deno.exit();
}

const taskName = args[0];
const command = args[1];
const watchPath: string | undefined = args[2];

await ensureFile("tmon.json", JSON.stringify({ version: "1.0.0", tasks: {} }));

const cfg = JSON.parse(await Deno.readTextFile("tmon.json")) as Config;

cfg.tasks[taskName] = {
	cmd: command
};
if (watchPath) cfg.tasks[taskName].watch = watchPath;

clog(`Added task ${taskName} to tmon.json to execute "${command}"${watchPath ? ` on ${watchPath} update` : ""}...`, "Log", "tmon_add");

await Deno.writeTextFile("tmon.json", JSON.stringify(cfg));
clog("Written tmon.json to disk...", "Log", "tmon_add");
