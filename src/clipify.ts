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
async function trimMedia(fileName: string, dest: string, start: number | string = 0, end?: number | string): Promise<void> {
	end ??= await pollDuration(fileName);
	const formattedStart = typeof start === "number" ? s2time(start) : start;
	const formattedEnd = typeof end === "number" ? s2time(end) : end;
	const regex = /^\d+:\d+:\d+(?:\.\d+)?$/;
	if (!regex.test(formattedStart)) {
		clog(`${formattedStart} does not match expected format, should be h:m:s`, "Error");
		Deno.exit(1);
	}
	if (!regex.test(formattedEnd)) {
		clog(`${formattedEnd} does not match expected format, should be h:m:s`, "Error");
		Deno.exit(1);
	}
	clog(`🎬 Trimming ${fileName} from ${formattedStart} to ${formattedEnd}...`, "Log", trimMedia.name);
	const hardwareEncoders = [
		{
			name: "h264_nvenc",
			args: ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr", "-cq", "18", "-b:v", "0"]
		},
		{
			name: "h264_qsv",
			args: ["-c:v", "h264_qsv", "-preset", "medium", "-global_quality", "18"]
		},
		{
			name: "h264_amf",
			args: ["-c:v", "h264_amf", "-quality", "quality", "-rc", "cqp", "-qp_i", "18", "-qp_p", "18"]
		},
		{
			name: "h264_videotoolbox",
			args: ["-c:v", "h264_videotoolbox", "-q:v", "65"]
		}
	];

	for (const encoder of hardwareEncoders) {
		const args = ["-y", "-ss", formattedStart, "-to", formattedEnd, "-i", fileName, ...encoder.args, "-c:a", "aac", "-b:a", "192k", dest];

		clog(`🎥 Attempting hardware encoding with ${encoder.name}...`, "Log", trimMedia.name);

		const proc = makeffmpeg(args);
		const result = await proc.output();

		if (result.code === 0) {
			clog(`✅ Trimmed successfully using ${encoder.name}`, "Log", trimMedia.name);
			return;
		}

		clog(`⚠️ ${encoder.name} failed, trying next encoder...`, "Log", trimMedia.name);
	}

	// All hardware encoders failed.
	clog(`⚙️ Hardware encoding unavailable. Falling back to software encoding with libx264...`, "Log", trimMedia.name);

	const softwareArgs = ["-y", "-ss", formattedStart, "-to", formattedEnd, "-i", fileName, "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-c:a", "aac", "-b:a", "192k", dest];

	const proc = makeffmpeg(softwareArgs);
	const result = await proc.output();

	if (result.code !== 0) {
		clog(new TextDecoder().decode(result.stderr), "Error", "ffmpeg");

		clog(`❌ ffmpeg failed to trim ${fileName} into ${dest}!`, "Error", trimMedia.name);
		return;
	}

	clog(`✅ Trimmed successfully using software encoding`, "Log", trimMedia.name);
}

async function clipVideo(
	fileName: string,
	timestamps: (number | string)[],
	destNames: (i: number) => string = i => path.join(path.dirname(fileName), path.basename(fileName, path.extname(fileName)), path.basename(fileName, path.extname(fileName)) + "_" + i + path.extname(fileName))
): Promise<void> {
	let previous: string | number = 0;
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
	clog("video.mp4.txt contains some timestamps:");
	clog("5, 10.6, 31, 74.3\n\n");

	clog("Timestamps can either be literal second values (i.e., 30.5, 132), or can be formatted as h:m:s (i.e., 0:1:32)");
	clog("Please provide a video file...", "Error");
	Deno.exit(1);
}

const filePath = Deno.args[0];
const timestampFile = await Deno.readTextFile(filePath + ".txt");
const timestamps = timestampFile
	.replaceAll("\n", "")
	.replaceAll(" ", "")
	.split(",")
	.filter(x => x.length)
	.map(x => (x.includes(":") ? x.trim() : Number(x)));
await clipVideo(filePath, timestamps);
