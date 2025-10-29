const templateTMON = {
	version: "1.0.0",
	tasks: {
		watch: {
			desc: "If any typescript file is changed, run linter and tests.",
			watch: "src/**/*.ts",
			cmd: ["deno lint", "tmon test"]
		},
		test: {
			desc: "Run deno tests",
			cmd: "deno test -A"
		},
		runner: {
			desc: "Run main on any typescript or JSON file change.",
			watch: ["src/**/*.ts", "src/config/*.json"],
			cmd: "deno run -A main.ts"
		}
	}
};

await Deno.writeTextFile("tmon.json", JSON.stringify(templateTMON, undefined, 4));
