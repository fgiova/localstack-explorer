import { spawn } from "node:child_process";

export function spawnProcess(
	command: string,
	args: string[],
	// biome-ignore lint/suspicious/noExplicitAny: This is a utility function, we want to be able to pass any options to spawn
	options: Record<any, any>,
) {
	return new Promise((resolve, _reject) => {
		const proc = spawn(command, args, options);
		proc.stdout.on("data", (data) => {
			console.log(data.toString().trimEnd());
		});
		proc.stderr.on("data", (data) => {
			console.error(data.toString().trimEnd());
		});
		proc.on("close", (code) => {
			console.log(`exited with code ${code}`);
			resolve(true);
		});
	});
}
