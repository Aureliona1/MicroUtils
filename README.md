# MicroUtils

Small utilities, powered by Deno.

All of the following utilities require [Deno](deno.com) to be installed on your system.

## Tiny Daemon

TMON is a tiny daemon program that can watch the file system and run programs when it detects an update. It is controlled by a JSON config file that must be present in the directory that TMON is run in.

The JSON must follow this object schema:

```ts
{
	"version": string;
	"tasks": Record<string,
		{
			"desc"?: string;
			"cmd": string | string[];
			"watch"?: string | string[];
		}
	>;
};
```

TMON can be installed with:

```bash

```
