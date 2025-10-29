# MicroUtils

Small utilities, powered by Deno.

All of the following utilities require [Deno](deno.com) to be installed on your system.

To install all utilities from this package, run:

```bash
deno run -A "https://raw.githubusercontent.com/Aureliona1/MicroUtils/refs/heads/main/installer.ts"
```

To uninstall all utilities from your system, run:

```bash
deno run -A "https://raw.githubusercontent.com/Aureliona1/MicroUtils/refs/heads/main/uninstaller.ts"
```

## Exportify

Automatically and recursively check through all subdirectories of the supplied directory to find TypeScript files and add them to a `mod.ts` file.

This saves having to manually add all of your files to a common `mod.ts` exports file.

For example:

```bash
exportify src/
```

Exportify can be installed with:

```bash
deno install -f -g -n exportify -A -r "https://raw.githubusercontent.com/Aureliona1/MicroUtils/refs/heads/main/src/exportify.ts"
```

## Hexify

Convert any string into a hex pattern.

You can install hexify with:

```bash
deno install -f -g -n hexify -r "https://raw.githubusercontent.com/Aureliona1/MicroUtils/refs/heads/main/src/hexify.ts"
```

## Tiny Daemon

TMON is a tiny daemon program that can watch the file system and run programs when it detects an update. It is controlled by a JSON config file that must be present in the directory that TMON is run in.

The JSON must follow this object schema:

```ts
{
	"version": "1.0.0"; // Version is currently ignored by TMON, this can therefore hold any value. But must always be present.
	"tasks": Record<string,
		{
			"desc"?: string;
			"cmd": string | string[];
			"watch"?: string | string[];
		}
	>;
};
```

For each task, if a `watch` parameter isn't provided, the task is considered a "one-off" task and will be run once before terminating.

TMON can be installed with:

```bash
deno install -f -g -n tmon -A -r "https://raw.githubusercontent.com/Aureliona1/MicroUtils/refs/heads/main/src/tmon.ts"
```
