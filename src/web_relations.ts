import { regexInput } from "jsr:@aurellis/helpers@1.4.3";

async function getRelations(addr: string): Promise<string[]> {
	if (!/^https?:\/\//.test(addr)) {
		addr = "http://" + addr;
	}
	try {
		const res = await fetch(addr);
		if (!res.ok) {
			return [];
		}

		// Download this
		const bytes = await res.bytes();

		// Get more links - just try for anything that isn
		const links: string[] = [];
		let text = new TextDecoder().decode(bytes);
		for (let end = 0, start = text.search(/=['"]https?:\/\//); end !== -1; start = text.search(/=["']https?:\/\//)) {
			if (start === -1) break;
			const char = text[start + 1] ?? '"';
			start += 2;
			end = text.indexOf(char, start);
			links.push(text.substring(start, end));
			text = text.substring(end);
		}
		// Look for href in html
		text = new TextDecoder().decode(bytes);
		for (let end = 0, start = text.search(/href=["']/); end !== -1; start = text.search(/href=["']/)) {
			if (start === -1) break;
			const space = text.indexOf(" ", start + 6);
			const char = text[start + 5];
			const quote = text.indexOf(char, start + 6);
			start += 6;
			end = Math.min(space, quote);
			let link = text.substring(start, end);
			if (!link.startsWith("http")) link = addr + "/" + link;
			links.push(link);
			text = text.substring(end);
		}
		return links;
	} catch {
		return [];
	}
}

let baseAddr = Deno.args[0];

baseAddr ??= regexInput("What address do you want to scrape: ", /^.+$/);

console.log((await getRelations(baseAddr)).join("\n"));
