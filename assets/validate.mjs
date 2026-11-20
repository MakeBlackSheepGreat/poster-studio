#!/usr/bin/env node
/**
 * validate.mjs — poster-studio 的单一校验入口。
 *
 * 校验对象：
 *   1. 模板 HTML 内联配置与 examples/*.demo.json 完全一致
 *   2. 配置结构符合 assets/schema/poster-config.schema.json
 *   3. 配置文案符合 assets/rules/copy-rules.json（字数、禁用词、日期、CTA、二维码互斥）
 *   4. 模板不含外部资源引用，导出接口齐全
 *   5. 文档与代码一致：VERSION / SKILL.md 版本 / 生成区块
 *
 * 用法：
 *   node assets/validate.mjs           校验，失败退出码 1
 *   node assets/validate.mjs --write   重写 README、SKILL.md 中的生成区块
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const WRITE = process.argv.includes("--write");
const TICK = String.fromCharCode(96);

const read = (p) => readFileSync(path.join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

const version = read("VERSION").trim();
const templates = readJson("assets/rules/templates.json");
const copyRules = readJson("assets/rules/copy-rules.json");
const schema = readJson("assets/schema/poster-config.schema.json");

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(schema);
const validators = Object.fromEntries(
  templates.templates.map((t) => [t.id, ajv.getSchema(schema.$id + "#/$defs/" + t.id)]),
);

const failures = [];
const passes = [];
const fail = (check, detail) => failures.push({ check, detail });
const pass = (check) => passes.push(check);

/* ---------- 基础工具 ---------- */

const chars = (s) => [...s].length;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  }
  return value;
}

function collectStrings(node, dottedPath) {
  let current = [node];
  for (const raw of dottedPath.split(".")) {
    const isArray = raw.endsWith("[]");
    const key = isArray ? raw.slice(0, -2) : raw;
    const next = [];
    for (const item of current) {
      if (item == null || typeof item !== "object" || !(key in item)) continue;
      const value = item[key];
      if (isArray) {
        if (Array.isArray(value)) next.push(...value);
      } else {
        next.push(value);
      }
    }
    current = next;
  }
  return current.filter((v) => typeof v === "string");
}

function walkStrings(node, prefix = "$", out = []) {
  if (typeof node === "string") out.push({ path: prefix, value: node });
  else if (Array.isArray(node)) node.forEach((v, i) => walkStrings(v, prefix + "[" + i + "]", out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walkStrings(v, prefix + "." + k, out);
  return out;
}

/* ---------- 1. 模板与示例配置一致性 ---------- */

const loaded = new Map();
for (const t of templates.templates) {
  if (!existsSync(path.join(ROOT, t.file))) {
    fail("模板存在", t.file + " 不存在");
    continue;
  }
  const html = read(t.file);
  const match = html.match(/<script id="config" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    fail("内联配置", t.file + " 缺少内联配置脚本");
    continue;
  }
  let config;
  try {
    config = JSON.parse(match[1]);
  } catch (e) {
    fail("内联配置", t.file + " 的 JSON 解析失败：" + e.message);
    continue;
  }
  loaded.set(t.id, { html, config });

  if (!existsSync(path.join(ROOT, t.demo))) {
    fail("示例配置", t.demo + " 不存在");
    continue;
  }
  const demo = readJson(t.demo);
  if (JSON.stringify(canonical(config)) !== JSON.stringify(canonical(demo))) {
    fail("模板与示例一致", t.id + "：模板内联配置与 " + t.demo + " 不一致，先同步这两处再提交");
  } else {
    pass("模板与示例一致：" + t.id);
  }
}

/* ---------- 2. 结构校验 ---------- */

for (const t of templates.templates) {
  const entry = loaded.get(t.id);
  if (!entry) continue;
  if (!validators[t.id](entry.config)) {
    const detail = validators[t.id].errors
      .map((e) => (e.instancePath || "$") + " " + e.message + (e.params ? " " + JSON.stringify(e.params) : ""))
      .join("；");
    fail("结构校验", t.id + "：" + detail);
  } else {
    pass("结构校验：" + t.id);
  }
}

/* ---------- 3. 文案规则 ---------- */

const TEXT_RULES = [
  ["title", "title"],
  ["subtitle", "subtitle"],
  ["pill", "pill"],
  ["kicker", "kicker"],
  ["dateSticker", "dateSticker"],
  ["cta", "cta"],
  ["footer", "footer"],
  ["badge", "badge"],
  ["lead", "lead"],
  ["pointsTitle", "cardTitle"],
  ["pointsSub", "cardDesc"],
  ["points[].title", "pointTitle"],
  ["points[].desc", "pointDesc"],
  ["speakers[].name", "speakerName"],
  ["speakers[].role", "speakerRole"],
  ["speakers[].topic", "speakerTopic"],
  ["lines[]", "line"],
  ["sections[].title", "cardTitle"],
  ["sections[].lines[]", "cardDesc"],
  ["sections[].items[].v", "infoValue"],
  ["sections[].rows[].e", "timelineEntry"],
  ["agenda.rows[].title", "agendaRow"],
  ["agenda.rows[].talks[].bullets[]", "bullet"],
  ["intro.cards[].desc", "cardDesc"],
  ["proof.cards[].desc", "cardDesc"],
  ["qrGroups.groups[].name", "qrGroupName"],
  ["qrGroups.groups[].desc", "qrGroupDesc"],
  ["qrGroups.groups[].tag", "qrGroupTag"],
];

for (const [id, entry] of loaded) {
  const cfg = entry.config;
  for (const [dotted, limitKey] of TEXT_RULES) {
    const limit = copyRules.limits[limitKey];
    for (const text of collectStrings(cfg, dotted)) {
      if (chars(text) > limit) {
        fail("字数上限", id + " " + dotted + " 超出 " + limit + " 字（" + chars(text) + " 字）：" + text);
      }
    }
  }

  for (const { path: at, value } of walkStrings(cfg)) {
    for (const word of copyRules.bannedWords) {
      if (value.includes(word)) fail("禁用词", id + " " + at + " 含「" + word + "」：" + value);
    }
    for (const rule of copyRules.bannedPatterns) {
      if (new RegExp(rule.pattern).test(value)) fail("禁用句式", id + " " + at + " 命中 " + rule.id + "（" + rule.why + "）：" + value);
    }
    const dateMatch = value.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (dateMatch) {
      const month = Number(dateMatch[1]);
      const day = Number(dateMatch[2]);
      if (month < 1 || month > 12 || day < 1 || day > 31) fail("日期格式", id + " " + at + "：" + value);
    }
  }

  const ctaText = typeof cfg.cta === "string" ? cfg.cta : null;
  if (ctaText && !copyRules.ctaVerbs.some((verb) => ctaText.includes(verb))) {
    fail("CTA 动词", id + ".cta 不在 ctaVerbs 里，也没包含其中任一动词：" + ctaText);
  }

  if (cfg.qrGroups && Array.isArray(cfg.qrGroups.groups) && cfg.qrGroups.groups.length > 0) {
    const singles = [cfg.qr && cfg.qr.image, cfg.cta && cfg.cta.qr && cfg.cta.qr.image].filter(Boolean);
    if (singles.length) fail("二维码互斥", id + " 配了 qrGroups，单码字段仍带 image，同一张图会出两个码");
  }

  if (cfg.exportName && cfg.exportName !== "poster-" + id) {
    fail("导出名", id + " 的 exportName 应为 poster-" + id + "，实际 " + cfg.exportName);
  }
}

/* ---------- 4. 模板自包含检查 ---------- */

const EXTERNAL = [
  { pattern: /<(script|link|img)[^>]+(src|href)\s*=\s*["']\s*(https?:|\/\/)/i, why: "引用了外部资源" },
  { pattern: /@import\s+url\(\s*["']?https?:/i, why: "CSS @import 外部样式" },
  { pattern: /url\(\s*["']?https?:\/\//i, why: "CSS 里引用了外部图片" },
  { pattern: /<iframe/i, why: "含 iframe" },
];

let selfContained = true;
let exportReady = true;
for (const [id, entry] of loaded) {
  for (const rule of EXTERNAL) {
    if (rule.pattern.test(entry.html)) {
      fail("模板自包含", id + " " + rule.why);
      selfContained = false;
    }
  }
  const width = entry.html.match(/#poster\s*\{[^}]*?width\s*:\s*(\d+)px/);
  if (!width) fail("画布尺寸", id + " 的 #poster 没有固定宽度");
  if (!/window\.__posterReport\s*=/.test(entry.html) || !/window\.__exportJPG\s*=/.test(entry.html)) {
    fail("导出接口", id + " 缺少导出或报告接口");
    exportReady = false;
  }
  if (!/function fitText/.test(entry.html)) fail("字号压缩", id + " 缺少 fitText，长文案不会自动缩字号也不会告警");
  if (!/function qrSVG\(/.test(entry.html)) fail("占位二维码", id + " 缺少 qrSVG，二维码位置只会渲染文字占位");
}
if (selfContained) pass("模板自包含：无外链、无 iframe");
if (exportReady) pass("导出接口：五个模板齐全");

/* ---------- 5. 文档一致性 ---------- */

const canvasOf = (id) => {
  const html = loaded.get(id).html;
  const meta = templates.templates.find((t) => t.id === id);
  const width = Number(html.match(/#poster\s*\{[^}]*?width\s*:\s*(\d+)px/)[1]);
  const minHeight = (html.match(/#poster\s*\{[^}]*?min-height\s*:\s*(\d+)px/) || [])[1];
  const fixedHeight = (html.match(/#poster\s*\{[^}]*?height\s*:\s*(\d+)px/) || [])[1];
  if (meta.shape === "fixed") return width + " × " + (fixedHeight || minHeight);
  return minHeight ? width + " × ≥" + minHeight : width + " × 自动高";
};

function renderTable(columns) {
  const head = columns.map((c) => c.label);
  const rows = templates.templates.map((t) => columns.map((c) => c.value(t, canvasOf(t.id))));
  return [
    "| " + head.join(" | ") + " |",
    "| " + head.map(() => "---").join(" | ") + " |",
    ...rows.map((r) => "| " + r.join(" | ") + " |"),
  ].join("\n");
}

const SCRIPT_DOCS = {
  "assets/validate.mjs": "校验配置结构、文案规则、模板自包含与文档一致性",
  "assets/verify-export.mjs": "无头浏览器导出 JPG（Node 22+ 与本机 Chrome/Edge），返回溢出与文字压缩报告",
  "assets/make-qr.py": "生成真实二维码 PNG 与 data URI",
  "assets/verify-qr.py": "解码导出图里的二维码，可断言期望地址",
  "assets/qc-split.py": "长图切片降采样，便于逐段目检",
  "tools/build-previews.mjs": "重新导出 docs 预览图",
};

const GENERATORS = {
  "templates-readme": () =>
    renderTable([
      { label: "模板", value: (t) => t.label },
      { label: "文件", value: (t) => TICK + t.file + TICK },
      { label: "画布", value: (t, canvas) => canvas },
      { label: "用途", value: (t) => t.use },
    ]),
  "templates-skill": () =>
    renderTable([
      { label: "id", value: (t) => TICK + t.id + TICK },
      { label: "文件", value: (t) => TICK + t.file.replace("assets/", "") + TICK },
      { label: "画布", value: (t, canvas) => canvas },
      { label: "什么时候用", value: (t) => t.use },
    ]),
  scripts: () =>
    [
      "| 文件 | 作用 |",
      "| --- | --- |",
      ...Object.entries(SCRIPT_DOCS).map(([file, desc]) => "| " + TICK + file + TICK + " | " + desc + " |"),
    ].join("\n"),
};

function syncGenerated(file) {
  if (!existsSync(path.join(ROOT, file))) {
    fail("文档存在", file + " 不存在");
    return;
  }
  let text = read(file);
  let changed = false;
  for (const [name, build] of Object.entries(GENERATORS)) {
    const block = new RegExp("(<!-- gen:" + name + ":start -->)([\\s\\S]*?)(<!-- gen:" + name + ":end -->)");
    if (!block.test(text)) continue;
    const expected = build();
    const next = text.replace(block, (_, start, __, end) => start + "\n" + expected + "\n" + end);
    if (next !== text) {
      if (WRITE) {
        text = next;
        changed = true;
      } else {
        fail("生成区块", file + " 的 " + name + " 区块与代码不一致，运行 node assets/validate.mjs --write");
      }
    }
  }
  if (changed) {
    writeFileSync(path.join(ROOT, file), text);
    pass("已重写生成区块：" + file);
  }
}

syncGenerated("README.md");
syncGenerated("SKILL.md");

const skill = read("SKILL.md");
const frontVersion = (skill.match(/^version:\s*"([^"]+)"/m) || [])[1];
if (frontVersion !== version) fail("版本一致", "SKILL.md 为 " + frontVersion + "，VERSION 为 " + version);
else pass("版本一致：" + version);

const pkg = readJson("package.json");
if (pkg.version !== version) fail("版本一致", "package.json 为 " + pkg.version + "，VERSION 为 " + version);
else pass("package.json 版本一致：" + version);

for (const file of ["README.md", "SKILL.md", "DESIGN-LANGUAGE.md", "COPYWRITING.md"]) {
  const text = read(file);
  if (/[├└│]──/.test(text)) fail("禁用字符画", file + " 含 ASCII 目录树，改用表格或 mermaid");
}

for (const file of ["README.md", "SKILL.md"]) {
  const text = read(file);
  for (const word of copyRules.bannedWords) {
    if (text.includes(word)) fail("文档禁用词", file + " 含「" + word + "」");
  }
}

for (const t of templates.templates) {
  const shot = "docs/preview-" + t.id + ".jpg";
  if (!existsSync(path.join(ROOT, shot))) fail("预览图", shot + " 不存在，运行 node tools/build-previews.mjs");
}

/* ---------- 输出 ---------- */

for (const line of passes) console.log("PASS  " + line);
for (const f of failures) console.log("FAIL  [" + f.check + "] " + f.detail);

console.log("");
console.log(failures.length ? "校验失败：" + failures.length + " 项" : "校验通过：" + passes.length + " 项，版本 " + version);
process.exit(failures.length ? 1 : 0);
