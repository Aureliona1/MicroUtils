if (!Deno.args.length) {
	Deno.exit(0);
}

console.log(
	"0x" +
		Deno.args
			.map(arg =>
				Array.from(arg)
					.map(x => x.charCodeAt(0).toString(16))
					.join("")
			)
			.join(" ".charCodeAt(0).toString(16))
);
