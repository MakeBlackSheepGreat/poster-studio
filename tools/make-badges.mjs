import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "badges");
mkdirSync(OUT, { recursive: true });

function textWidth(text) {
  let w = 0;
  for (const ch of text) w += /[0-9a-z.]/i.test(ch) ? 6.4 : 8.4;
  return Math.ceil(w) + 12;
}

function badge(label, value, color) {
  const leftW = textWidth(label);
  const rightW = textWidth(value);
  const width = leftW + rightW;
  const leftX = leftW / 2;
  const rightX = leftW + rightW / 2;
  const lines = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="20" role="img" aria-label="' + label + ": " + value + '">',
    "<title>" + label + ": " + value + "</title>",
    '<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>',
    '<clipPath id="r"><rect width="' + width + '" height="20" rx="3" fill="#fff"/></clipPath>',
    '<g clip-path="url(#r)">',
    '<rect width="' + leftW + '" height="20" fill="#1f2430"/>',
    '<rect x="' + leftW + '" width="' + rightW + '" height="20" fill="' + color + '"/>',
    '<rect width="' + width + '" height="20" fill="url(#s)"/>',
    "</g>",
    '<g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">',
    '<text x="' + leftX + '" y="15" fill="#010101" fill-opacity=".3">' + label + "</text>",
    '<text x="' + leftX + '" y="14">' + label + "</text>",
    '<text x="' + rightX + '" y="15" fill="#010101" fill-opacity=".3">' + value + "</text>",
    '<text x="' + rightX + '" y="14">' + value + "</text>",
    "</g>",
    "</svg>",
  ];
  return lines.join("");
}

const version = readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const files = {
  "version.svg": badge("version", "v" + version, "#2E7DF6"),
  "license.svg": badge("license", "MIT", "#F5401C"),
  "templates.svg": badge("templates", "5", "#FF8A1E"),
  "deps.svg": badge("runtime deps", "0", "#7BD86A"),
};
for (const [name, svg] of Object.entries(files)) writeFileSync(path.join(OUT, name), svg);
console.log("badges: " + Object.keys(files).join(", "));
