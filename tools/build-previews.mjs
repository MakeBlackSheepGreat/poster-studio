import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, copyFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const WORK = path.join(ROOT, ".work", "preview");
const TMP = path.join(ROOT, ".work", "tmp");
mkdirSync(WORK, { recursive: true });
mkdirSync(TMP, { recursive: true });

const templates = JSON.parse(readFileSync(path.join(ROOT, "assets", "rules", "templates.json"), "utf8"));
const env = { ...process.env, TEMP: TMP, TMPDIR: TMP, TMPDIR_OVERRIDE: TMP };

for (const t of templates.templates) {
  const html = path.join(WORK, t.id + ".html");
  const jpg = path.join(WORK, t.id + ".jpg");
  copyFileSync(path.join(ROOT, t.file), html);
  const exported = spawnSync(process.execPath, [path.join(ROOT, "assets", "verify-export.mjs"), html, jpg, "1", "0.9"], { env, encoding: "utf8" });
  process.stdout.write(exported.stdout || "");
  if (exported.status !== 0) {
    process.stderr.write(exported.stderr || "");
    process.exit(exported.status || 1);
  }
  const resized = spawnSync("python", [path.join(ROOT, "tools", "resize.py"), jpg, path.join(ROOT, "docs", "preview-" + t.id + ".jpg"), "560", "82"], { env, encoding: "utf8" });
  process.stdout.write(resized.stdout || "");
  if (resized.status !== 0) {
    process.stderr.write(resized.stderr || "");
    process.exit(resized.status || 1);
  }
}
console.log("预览图已写入 docs/");
