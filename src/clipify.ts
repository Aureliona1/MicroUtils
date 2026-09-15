import { clog, ensureDir } from "jsr:@aurellis/helpers@1.6.2";
import * as path from "jsr:@std/path@1.1.6";

function s2time(s: number): string {
	const sec = s % 60;
	const min = Math.floor(s / 60) % 60;
	const hr = Math.floor(s / 3600);
	return `${hr}:${min}:${sec}`;
}

function makeffmpeg(args: string[]): Deno.ChildProcess {
	// clog("ffmpeg " + args.join(" "));
	return new Deno.Command("ffmpeg", { args, stdout: "piped", stderr: "piped" }).spawn();
}

// Returns 0 if invalid
async function pollDuration(fileName: string): Promise<number> {
	// clog(`⏱️  Getting duration of ${fileName}...`, "Log", pollDuration.name);
	const proc = new Deno.Command("ffprobe", { args: ["-v", "error", "-show_entries", "format=duration", "-of", "json", fileName], stdout: "piped" }).spawn();
	const json = await proc.stdout.json();
	if ((await proc.status).code === 0) {
		try {
			return parseFloat(json.format.duration);
		} catch (e) {
			clog(e, "Error", "ffprobe");
			clog(`❌ Failed to get metadata for ${fileName}!`, "Error", pollDuration.name);
		}
	} else {
		clog(`❌ ffprobe returned error status for ${fileName}!`, "Error", pollDuration.name);
	}
	return 0;
}

/**
 * @param start The start of the trimmed section (in seconds)
 * @param end The end of the trimmed section (in seconds)
 */
async function trimMedia(fileName: string, dest: string, start: number = 0, end?: number): Promise<void> {
	end ??= await pollDuration(fileName);
	clog(`🎬 Trimming ${fileName} from ${s2time(start)} to ${s2time(end)}...`, "Log", trimMedia.name);
	const args = ["-y", "-ss", s2time(start)];

	if (end !== undefined) {
		args.push("-to", s2time(end));
	}

	args.push("-i", fileName, "-c", "copy", dest);

	const proc = makeffmpeg(args);
	const code = await proc.output();
	if (code.code) {
		clog(new TextDecoder().decode(code.stderr), "Error", "ffmpeg");
		clog(`❌ ffmpeg failed to trim ${fileName} into ${dest}!`, "Error", trimMedia.name);
		return;
	}
	clog(`✅ Trimmed successfully`, "Log", trimMedia.name);
}

async function clipVideo(
	fileName: string,
	timestamps: number[],
	destNames: (i: number) => string = i => path.join(path.dirname(fileName), path.basename(fileName, path.extname(fileName)), path.basename(fileName, path.extname(fileName)) + "_" + i + path.extname(fileName))
): Promise<void> {
	let previous = 0;
	await ensureDir(path.join(path.dirname(fileName), path.basename(fileName, path.extname(fileName))));
	for (let i = 0; i < timestamps.length + 1; i++) {
		const end = timestamps[i];
		await trimMedia(fileName, destNames(i), previous, end);
		previous = end;
	}
}

if (!Deno.args.length) {
	clog("Clipify will add splits to the timestamps that you provide.");
	clog("Simply run this and supply the relative path of the media you wish to clip.");
	clog("In the same folder as the media, provide a txt file with the timestamps that you want to clip the video at, separated by commas.");
	clog("For example:");
	clog("video.mp4 -> The source video");
	clog("video.mp4.txt -> The timestamp file");
	clog("video.mp4.txt contains some timestamps (in seconds):");
	clog("5, 10.6, 31, 74.3\n\n");
	clog("Please provide a video file...");
	Deno.exit(1);
}

const filePath = Deno.args[0];
const timestampFile = await Deno.readTextFile(filePath + ".txt");
const timestamps = timestampFile
	.replaceAll("\n", "")
	.replaceAll(" ", "")
	.split(",")
	.filter(x => x.length)
	.map(x => Number(x));
await clipVideo(filePath, timestamps);
