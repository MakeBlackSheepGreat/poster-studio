#!/usr/bin/env node
/**
 * verify-export.mjs — 调用海报页面 window.__exportJPG() 导出 JPG。
 * 产出与页面「导出 JPG」按钮完全同链路（SVG foreignObject → canvas → JPEG）。
 *
 * 用法: node verify-export.mjs <海报.html> <输出.jpg> [scale=2] [quality=0.92]
 * 依赖: 无 npm 依赖；需要本机 Chrome 或 Edge（可用 CHROME_PATH 环境变量指定）。
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
if (argv.length < 2) {
  console.error("用法: node verify-export.mjs <海报.html> <输出.jpg> [scale=2] [quality=0.92]");
  process.exit(64);
}
const htmlPath = path.resolve(argv[0]);
const jpgPath = path.resolve(argv[1]);
const scale = Number(argv[2] || 2);
const quality = Number(argv[3] || 0.92);
if (!fs.existsSync(htmlPath)) { console.error("找不到 HTML: " + htmlPath); process.exit(66); }

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH, process.env.BROWSER_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  for (const p of candidates) { try { if (fs.existsSync(p)) return p; } catch {} }
  return null;
}

function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const timer = setTimeout(() => reject(new Error("CDP WebSocket 连接超时")), 10000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve({
        send(method, params = {}, sessionId) {
          return new Promise((res, rej) => {
            const mid = ++id;
            pending.set(mid, { res, rej });
            ws.send(JSON.stringify(Object.assign({ id: mid, method, params }, sessionId ? { sessionId } : {})));
          });
        },
        close() { try { ws.close(); } catch {} },
      });
    };
    ws.onerror = () => { clearTimeout(timer); reject(new Error("CDP WebSocket 连接失败")); };
    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch { return; }
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
      }
    };
  });
}

async function evalJS(cdp, sessionId, expression, awaitPromise = false) {
  const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true }, sessionId);
  if (r.exceptionDetails) {
    const d = r.exceptionDetails;
    throw new Error("页面脚本异常: " + (d.exception && d.exception.description ? d.exception.description : d.text));
  }
  return r.result ? r.result.value : undefined;
}

async function main() {
  const browser = findBrowser();
  if (!browser) { console.error("未找到 Chrome/Edge，请设置 CHROME_PATH"); process.exit(69); }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "poster-export-"));
  const proc = spawn(browser, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--window-size=1400,2800",
    "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank",
  ], { stdio: "ignore" });

  const cleanup = () => {
    try { proc.kill(); } catch {}
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch {} }, 500);
  };

  try {
    // 等 Chrome 写出 DevToolsActivePort（第一行端口，第二行 ws 路径）
    const portFile = path.join(profile, "DevToolsActivePort");
    let port = 0, wsPath = "";
    const t0 = Date.now();
    while (Date.now() - t0 < 20000) {
      if (fs.existsSync(portFile)) {
        const lines = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
        if (lines.length >= 2 && Number(lines[0]) > 0) { port = Number(lines[0]); wsPath = lines[1]; break; }
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!port) throw new Error("启动调试端口超时");

    const cdp = await connectCDP("ws://127.0.0.1:" + port + wsPath);
    const { targetId } = await cdp.send("Target.createTarget", { url: pathToFileURL(htmlPath).href });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Runtime.enable", {}, sessionId);

    // 等页面渲染完成 + 导出接口就绪
    const t1 = Date.now();
    for (;;) {
      const ready = await evalJS(cdp, sessionId,
        'document.readyState === "complete" && typeof window.__exportJPG === "function"');
      if (ready) break;
      if (Date.now() - t1 > 20000) throw new Error("页面渲染或导出接口就绪超时");
      await new Promise((r) => setTimeout(r, 200));
    }
    await evalJS(cdp, sessionId, "document.fonts ? document.fonts.ready.then(function(){return true;}) : true", true);

    const report = await evalJS(cdp, sessionId, "window.__posterReport ? window.__posterReport() : null");
    const result = await evalJS(cdp, sessionId,
      "window.__exportJPG({scale:" + scale + ",quality:" + quality + ",returnDataUrl:true})", true);
    if (!result || !result.ok || !result.dataUrl) throw new Error("导出接口返回失败: " + JSON.stringify(result));

    fs.mkdirSync(path.dirname(jpgPath), { recursive: true });
    fs.writeFileSync(jpgPath, Buffer.from(result.dataUrl.split(",")[1], "base64"));
    const kb = Math.round(fs.statSync(jpgPath).size / 1024);
    console.log("export ok: " + jpgPath);
    console.log("  尺寸 " + result.width + "×" + result.height + " · " + kb + " KB · scale=" + scale + " quality=" + quality);
    if (report) {
      console.log("  posterReport: " + report.width + "×" + report.height +
        " · overflow=" + JSON.stringify(report.overflow) +
        (report.shrunk && report.shrunk.length ? " · shrunk=" + JSON.stringify(report.shrunk) : " · shrunk=[]"));
      if (report.overflow && report.overflow.length) {
        console.log("  ⚠ 存在越界/溢出元素，请修版式后重新导出");
        cleanup();
        process.exit(2);
      }
      if (report.shrunk && report.shrunk.length) {
        console.log("  ⚠ 有文字被 fitText 压缩（data-fit）——文案太长，建议改短文案或调大该槽位字号区间");
        report.shrunk.forEach(function(s){ console.log("    - " + s.cls + " [" + s.fit + "] " + s.text); });
      }
    }
    cdp.close();
  } catch (e) {
    console.error("导出失败: " + e.message);
    cleanup();
    process.exit(1);
  }
  cleanup();
}
main();
