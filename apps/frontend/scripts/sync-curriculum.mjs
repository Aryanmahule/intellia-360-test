/**
 * Copies each grade's curriculum.json from the backend into the frontend
 * before `next dev` / `next build`.
 *
 * The student UI bundles the curriculum at build time
 * (src/context/StudentContext.tsx imports ../data/grades/<grade>/curriculum.json),
 * exactly as it did before the frontend and backend were split. The backend owns
 * those files — the editor writes them at runtime and the API reads them — so
 * they live once, in apps/backend/src/data/grades, and this copy is generated
 * (gitignored) rather than committed twice.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../backend/src/data/grades");
const target = path.resolve(here, "../src/data/grades");

if (!fs.existsSync(source)) {
  console.error(`[sync-curriculum] missing ${source}`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });

let copied = 0;
for (const grade of fs.readdirSync(source, { withFileTypes: true })) {
  if (!grade.isDirectory()) continue;
  const file = path.join(source, grade.name, "curriculum.json");
  if (!fs.existsSync(file)) continue;
  fs.mkdirSync(path.join(target, grade.name), { recursive: true });
  fs.copyFileSync(file, path.join(target, grade.name, "curriculum.json"));
  copied++;
}

console.log(`[sync-curriculum] copied ${copied} curriculum files from apps/backend`);
