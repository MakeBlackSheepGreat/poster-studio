---
name: poster-studio
description: 生成"活泼扁平卡通风"活动海报、宣传图、卖点图、干货长图、议程长图、单场介绍图：改一份 JSON 配置得到单文件 HTML，页面自带导出 JPG 按钮与自动化导出接口。用户要做海报、宣传图、活动预告、招新图、讲座海报、比赛海报、议程长图、干货信息图、卖点图、单场讲座或单场会议介绍图，或说"照着参考图做一张"（圆角色块 + 卡通吉祥物 + 粗黑体短句 + 黄底贴纸 + 二维码）时使用。
version: "1.5.0"
user-invocable: true
argument-hint: "[可选：参考图 / 活动内容 / 主题 / 尺寸]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
metadata:
  kind: tool
---

# poster-studio

产出两件：**单文件 HTML**（继续改）+ **JPG 成品图**。HTML 自带导出按钮，双击打开就能再导，不依赖构建工具和网络。

## 0. 开工先校验

在仓库根目录（有 `package.json` 与 `node_modules`）运行：

```bash
node assets/validate.mjs --write   # 重写文档里的生成区块
node assets/validate.mjs           # 校验，失败退出码 1
```

校验覆盖：模板内联配置与 `examples/*.demo.json` 一致、结构符合 JSON Schema、文案字数与禁用词、模板无外链、版本号与文档一致。第一次运行前执行 `npm install`。

在 skill 安装目录（`~/.dsh/skills/poster-studio/`）里只做复制模板与改配置，不需要跑这个脚本；导出与质检脚本无依赖，可直接用。

## 1. 工作流

1. **选模板**（见 §3 表格；`examples/<id>.demo.json` 是每个模板可直接用的起点配置）。
2. **复制模板**到目标目录，按内容重命名，例如 `海报-主视觉.html`。
3. **只改配置**：编辑 `<script id="config" type="application/json">` 里的 JSON。文字、颜色、吉祥物、二维码都在配置里，先别动 CSS；需要微调样式只改 `<style>` 里的 token。
4. **导出**：页面右上角「导出 JPG」或 `Ctrl+E`，或者 `node assets/verify-export.mjs 海报.html 海报.jpg 2`。
5. **质检**：跑 `verify-export.mjs` 看 `overflow` 与 `shrunk`，再用 `read_image` 打开 JPG 逐项目检，二维码用 `verify-qr.py` 解码核对。

## 2. 配置约定

- 结构由 `assets/schema/poster-config.schema.json` 定义，每个模板对应 `$defs/<id>`。
- 文案上限与禁用词在 `assets/rules/copy-rules.json`，由 `validate.mjs` 执行，不靠人记。
- 颜色只认 `blue` `red` `orange` `yellow` 四个 token。
- 图片字段只收 data URI（空字符串表示用占位图形）。
- 通用 `brand`：`letters` 2~4 个大写字母，`colors` 与 `letters` 等长，`bubbles` 可选装饰角标。

## 3. 模板

<!-- gen:templates-skill:start -->
| id | 文件 | 画布 | 什么时候用 |
| --- | --- | --- | --- |
| `promo` | `template-promo.html` | 1080 × 1920 | 活动主宣传、招新、比赛预告 |
| `spotlight` | `template-spotlight.html` | 1080 × 1496 | 卖点图、朋友圈传播图 |
| `long` | `template-long.html` | 750 × 自动高 | 干货、流程、任务分工长图 |
| `agenda` | `template-agenda.html` | 930 × 自动高 | 论坛、讲座、会议议程长图 |
| `talk` | `template-talk.html` | 1080 × ≥1920 | 单场讲座、单场会议介绍图 |
<!-- gen:templates-skill:end -->

配置字段以 `examples/<id>.demo.json` 为准，改之前先看那份文件。

## 4. 群二维码尾块与问卷条（五个模板通用）

末尾需要「扫码进群」时，在配置里加 `qrGroups`。多群时每个群写清「加这个群能得到什么」。

```json
"qrGroups": {
  "head": "扫码进群 · 两个群作用不同",
  "groups": [
    { "name": "活动通知群", "desc": "收教室变动和证明通知", "tag": "报名就加这个", "image": "data:image/png;base64,..." },
    { "name": "技术交流群", "desc": "平时聊工具和开源活动", "tag": "想继续折腾再加", "image": "data:image/png;base64,..." }
  ],
  "pick": "只参加活动加通知群；想长期交流再加技术群",
  "survey": { "title": "活动反馈问卷", "desc": "一分钟填完。", "tag": "扫码填写", "image": "data:image/png;base64,..." }
}
```

- `groups` 1~3 个，按顺序横排，第 1 张蓝框、第 2 张橙框。
- 配了 `qrGroups` 就不要再填单码 `image`：模板会自动跳过单码块，校验脚本也会拦下残留。
- 落款写 `footer` 或 `cta.footer` 都能渲染，模板已做兜底。
- `survey` 是通栏问卷条，不要塞成第三张群卡。

## 5. 导出接口

页面暴露两个全局函数，`file://` 下可用，无外部依赖：

- `window.__exportJPG({ scale = 2, quality = 0.92, filename = "poster.jpg", returnDataUrl = false })` → SVG foreignObject 栅格化到 canvas，输出 JPEG，返回 `{ ok, width, height, bytes, dataUrl }`。
- `window.__posterReport()` → `{ width, height, overflow: [], shrunk: [] }`，两项都应为空。

约束：图片必须 data URI 内联，不引网络字体，不用 CSS filter、mix-blend-mode、backdrop-filter，不放视频和 iframe。导出画布底色强制填白。

## 6. 质检清单

1. `node assets/verify-export.mjs 海报.html 海报.jpg 2` 返回 `ok:true`，`overflow=[]`，`shrunk=[]`。
2. 用 `read_image` 打开 JPG 看图：标题不截断、不压字，四边留白 ≥ 60px，颜色只出现在色块与关键词，二维码不被文字压盖。
3. 二维码解码：`python assets/verify-qr.py 海报.jpg --segments 8 --expect <真实URL>`，每个码都解出预期地址，退出码 0。
4. 单边超过 8192px 的长图先切片：`python assets/qc-split.py 海报.jpg 3`。
5. 导出分辨率 ≥ 2 倍画布；JPG 体积 200KB~3MB，超了把 quality 降到 0.85。

## 7. 常见问题

| 现象 | 处理 |
| --- | --- |
| 导出图空白、丢字 | 检查外链图片与网络字体，全部换成 data URI 和系统字体栈 |
| 文字发虚 | 提高 `scale` 到 2~3，确认导出前页面没有 transform 压缩 |
| `shrunk` 非空 | 某行被 fitText 压了字号，按 `copy-rules.json` 的上限改短文案 |
| 图上二维码扫不出来 | 跑 `verify-qr.py` 看解出的地址；解出旧地址说明配置里残留 `qr.image` 或 `cta.qr.image` |
| 品牌色块压住标题 | `.brand-block svg` 缺 `width:100%;height:100%;display:block`，SVG 按原始尺寸溢出了 |
| 长图打不开或看不清 | 用 `qc-split.py` 切片降采样后再看 |
| 从群截图抠码带残影 | 用 zxing 解出的四角坐标求外接框，外扩 6% 静区，不做整图二值化 |

## 8. 文案

写中文文案前读 `COPYWRITING.md`。字数和禁用词不用背，`validate.mjs` 会逐条报错。

## 9. 文件

<!-- gen:scripts:start -->
| 文件 | 作用 |
| --- | --- |
| `assets/validate.mjs` | 校验配置结构、文案规则、模板自包含与文档一致性 |
| `assets/verify-export.mjs` | 无头浏览器导出 JPG（Node 22+ 与本机 Chrome/Edge），返回溢出与文字压缩报告 |
| `assets/make-qr.py` | 生成真实二维码 PNG 与 data URI |
| `assets/verify-qr.py` | 解码导出图里的二维码，可断言期望地址 |
| `assets/qc-split.py` | 长图切片降采样，便于逐段目检 |
| `tools/build-previews.mjs` | 重新导出 docs 预览图 |
<!-- gen:scripts:end -->

设计语言与 token 见 `DESIGN-LANGUAGE.md`。安装位置：`~/.dsh/skills/poster-studio/`；仓库：<https://github.com/MakeBlackSheepGreat/poster-studio>（MIT）。模板里的机构名、地点、二维码都是占位内容，发布前替换。
