// deno-lint-ignore no-import-prefix
import { clog, pathAccessible, pathAccessibleSync } from "jsr:@aurellis/helpers@1.4.3";

if (Deno.args.length === 0) {
	clog("Please provide a location to export from...", "Warning");
	Deno.exit(-1);
}

let path = Deno.args[0].replaceAll("\\", "/");
path = /^\.?\//.test(path) ? path : "./" + path;
path = /\/$/.test(path) ? path.substring(0, path.length - 1) : path;

if (!pathAccessibleSync(path)) {
	clog(`${path} cannot be accessed, it may not exist...`, "Error");
	Deno.exit(-1);
}

const stat = await Deno.stat(path);
const exports: string[] = [];

async function exportDir(path: string) {
	for await (const f of Deno.readDir(path)) {
		if (f.isDirectory) {
			await exportDir(path + "/" + f.name);
		}
		if (f.isFile) {
			await exportFile(path + "/" + f.name);
		}
		if (f.isSymlink) {
			await exportSymlink(path + "/" + f.name);
		}
	}
}
async function exportFile(path: string) {
	if ((await pathAccessible(path)) && path.endsWith(".ts")) {
		exports.push(path);
	}
}
async function exportSymlink(path: string) {
	const res = await Deno.readLink(path);
	const stat = await Deno.stat(res);
	if (stat.isSymlink) {
		await exportSymlink(res);
	}
	if (stat.isDirectory) {
		await exportDir(res);
	}
	if (stat.isFile) {
		await exportFile(res);
	}
}

if (stat.isDirectory) {
	await exportDir(path);
} else if (stat.isFile) {
	await exportFile(path);
} else if (stat.isSymlink) {
	await exportSymlink(path);
} else {
	clog("Unsupported destination, please provide a path to a file, directory, or symlink...", "Warning");
	Deno.exit(-1);
}

clog(`Adding the following exports:\n${exports.join("\n")}...`);
await Deno.writeTextFile("mod.ts", exports.map(x => `export * from \"${x}\";`).join("\n"));
