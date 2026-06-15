const args = Deno.args;

if (!args.length) {
	console.error("Please provide a command to run for all subdirs!");
	Deno.exit(-1);
}

const isWindows = Deno.build.os === "windows";

const looksLikePowerShell = isWindows && (Deno.env.get("PSModulePath") !== undefined || Deno.env.get("PSExecutionPolicyPreference") !== undefined);

function buildShellCommand(cmd: string[]) {
	const joined = cmd.join(" ").trim();

	if (isWindows) {
		if (looksLikePowerShell) {
			return {
				cmd: "powershell.exe",
				args: ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", `& { ${joined} }`]
			};
		}

		return {
			cmd: "cmd.exe",
			args: ["/d", "/s", "/c", joined]
		};
	}

	return {
		cmd: "sh",
		args: ["-c", joined]
	};
}

async function r(dir: string) {
	const pwd = Deno.cwd();
	Deno.chdir(dir);

	const { cmd, args: shellArgs } = buildShellCommand(args);

	const proc = new Deno.Command(cmd, {
		args: shellArgs,
		stdout: "inherit",
		stderr: "inherit",
		stdin: "inherit"
	}).spawn();

	await proc.output();

	Deno.chdir(pwd);

	for await (const e of Deno.readDir(dir)) if (e.isDirectory) await r(dir + "/" + e.name);
}

await r("./");
