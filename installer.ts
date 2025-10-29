const API_URL = "https://api.github.com/repos/Aureliona1/MicroUtils/contents/src";

type GitHubRes = {
	name: string;
	path: string;
	sha: string;
	size: number;
	url: string;
	html_url: string;
	git_url: string;
	download_url: string;
	type: "file" | "dir";
	_links: unknown;
}[];

const res: GitHubRes = await(await fetch(API_URL)).json();

for (const item of res) {
	console.log(`Installing: ${item.name}`);
	const cmd = new Deno.Command("deno", {
		args: ["install", "-g", "-f", "-n", item.name.replaceAll(".ts", ""), "-A", item.download_url]
	});
	const out = await cmd.output();
	console.log(new TextDecoder().decode(out.stdout));
}
