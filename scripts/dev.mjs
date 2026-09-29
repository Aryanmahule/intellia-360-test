/**
 * `npm run dev` — starts the backend API (http://localhost:4000) and the
 * frontend (http://localhost:3000) together, prefixing each line of output with
 * its app. Ctrl+C stops both; if either exits, the other is stopped too.
 *
 * Plain Node so it behaves the same on Windows, macOS and Linux without an
 * extra dependency. Run one app alone with `npm run dev:backend` or
 * `npm run dev:frontend`.
 */
import { spawn } from "node:child_process";

const apps = [
  { name: "backend ", script: "dev:backend", color: "\x1b[35m" },
  { name: "frontend", script: "dev:frontend", color: "\x1b[36m" },
];

const reset = "\x1b[0m";
const children = [];
let stopping = false;

function prefix(app, stream, target) {
  let buffered = "";
  stream.on("data", (chunk) => {
    buffered += chunk.toString();
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";
    for (const line of lines) target.write(`${app.color}[${app.name}]${reset} ${line}\n`);
  });
}

function stopAll(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) {
      if (process.platform === "win32") spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
      else child.kill("SIGTERM");
    }
  }
  process.exitCode = code;
}

for (const app of apps) {
  const child = spawn("npm", ["run", app.script], {
    stdio: ["inherit", "pipe", "pipe"],
    shell: process.platform === "win32",
    env: process.env,
  });
  prefix(app, child.stdout, process.stdout);
  prefix(app, child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (!stopping) console.log(`[${app.name}] exited with code ${code}; stopping the other app.`);
    stopAll(code ?? 1);
  });
  children.push(child);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
