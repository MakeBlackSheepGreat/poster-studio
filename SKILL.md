---
name: poster-studio
description: 一键生成"活泼扁平卡通风"活动海报/宣传图/卖点图/干货长图/单场介绍图：套模板改一份 JSON 配置即得单文件 HTML，页面自带"导出 JPG"按钮与自动化导出接口。当用户要做海报、宣传图、活动预告、招新/讲座/比赛海报、议程长图、干货信息图、卖点图、讲座/会议单场介绍图，或说"照着参考图/这种风格做海报"（圆角色块 + 卡通吉祥物 + 粗黑体短句 + 黄底贴纸 + 二维码）时使用。含设计语言规范、中文文案规则（COPYWRITING.md）、五个可改配置的模板（主视觉/卖点对话框/长图/议程长图/单场介绍图）、群二维码尾块与问卷条（qrGroups）、真实二维码脚本、JPG 导出与质检流程（溢出+文字压缩双告警+二维码解码核对）。
version: "1.4.4"
user-invocable: true
argument-hint: "[可选：参考图 / 活动内容 / 主题 / 尺寸（1080×1920 主视觉、1080×1496 卖点图、750 长图、930 议程长图、1080 单场介绍图）]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# poster-studio：扁平活泼风海报一键生成

产出物固定两件：**单文件 HTML（可继续改）** + **JPG 成品图**。HTML 自带导出按钮，双击打开就能再导出，不依赖任何构建工具和网络。

## 0. 设计语言（做图前先读）

完整拆解与 token 见同目录 `DESIGN-LANGUAGE.md`。速记版：

- **白底 + 四色平涂**：蓝 `#2E7DF6` / 朱红 `#F5401C` / 橙 `#FF8A1E` / 明黄 `#FFC53D`；正文永远黑白，黄底必黑字、蓝底必白字，信息层最多 3 个彩色。
- **全圆角、无投影、无渐变**：胶囊 999px、卡片 28px、照片 24px；"立体感"只用硬边偏移色块（`8px 8px 0` 实色）。
- **特粗黑体短句**：标题字重 900（68~88px），正文 28~36px 行距 1.6，一行 ≤ 16 字；标题一行 ≤ 12 字。
- **卡通吉祥物 + 涂鸦装饰**：大圆眼扁平吉祥物（占版 ≤ 35%）、对话气泡角标、超大花括号、星芒、闪电、手写下划块、黄底日期贴纸、黄框二维码。每张挑 3~5 个，别堆满。
- **强 CTA**：底部固定"日期贴纸 + 二维码 + 行动动词"三件套。
- **五种构图配方**：①主视觉型（logo→大标题→胶囊→花括号正文→吉祥物+二维码）②卖点对话框型（巨大描边气泡 + 三行大字：痛点问句/主张句/收益句）③干货长图型（品牌头→手写分节标题→同构卡片×N→收尾）④议程长图型（浅灰底+白卡：品牌头→书签标签+信息卡→时间轴+嘉宾卡→二维码落款）⑤单场介绍图型（品牌头→场次胶囊→标题/副题→meta 胶囊条→要点卡×N 或讲者卡×N→荧光笔收尾→单码横条）。①②③⑤白底，④浅灰底 `#F2F2F3`+白卡、允许极浅投影。

## 1. 工作流（一键 6 步）

1. **选模板**（决策表见 §8）：单屏活动预告/招新 → `assets/template-promo.html`（1080×1920）；纯卖点/朋友圈传播 → `assets/template-spotlight.html`（1080×1496 描边气泡三行大字）；干货/流程/任务分工 → `assets/template-long.html`（750×自动高）；论坛/讲座/会议议程 → `assets/template-agenda.html`（930×自动高，时间轴+嘉宾卡+证明规则）。
2. **复制模板**到目标目录并按内容重命名（如 `海报01-主宣传.html`）。模板是自包含单文件，复制即用。
3. **只改配置**：编辑 `<script id="config" type="application/json">` 里的 JSON（字段表见 §2~§6）。写文案前过一遍 `COPYWRITING.md` 的 8 条规则（标题 10~12 字、每行 ≤16 字、禁用词清单）。文字、颜色、二维码、吉祥物都在配置里；不要先动 CSS。需要微调样式时才改 `<style>` 里的 token。
4. **浏览器预览**：双击 HTML（file:// 即可）。页面自动按窗口缩放预览，右上角工具条有"导出 JPG"。
5. **导出 JPG**（三选一）：
   - 页面按钮「导出 JPG」或快捷键 `Ctrl+E`（2 倍分辨率，画布 1080×1920 → 2160×3840）；
   - 自动化/批处理：`node <skill>/assets/verify-export.mjs 海报.html 海报.jpg 2`（无头浏览器直接调页面导出接口，产出的就是按钮导出的同一条链路）；
   - 备用通道（导出接口异常时）：`chrome --headless=new --screenshot=out.png --window-size=W,H --hide-scrollbars file:///...html` 再把 PNG 转 JPG。
6. **质检**（必做，见 §10）：`read_image` 打开 JPG 逐项核对 + 跑 `__posterReport()` 查溢出与文字压缩，改配置后重新导出。

## 2. 模板一：`template-promo.html`（1080×1920 主视觉）

```json
{
  "brand":   { "letters": ["C","A","I"], "colors": ["blue","red","orange"], "bubbles": ["</>","♥"] },
  "org":     "XX 大学 XX 协会",
  "title":   "第一次 AI 讲座 × AI 会议",
  "subtitle":"Workbuddy × Trae 动手专场",
  "pill":    "讲座教学 + 子话题演讲",
  "lines":   ["一行一句，≤16 字", "第二句", "第三句", "第四句", "第五句"],
  "mascot":  "robot",
  "dateSticker": "10月31日 教学楼 101",
  "cta":     "立即扫码报名",
  "qr":      { "seed": 20261031, "note": "占位二维码；发布前把报名码图片(≤120KB)转 data URI 填到 qr.image" },
  "footer":  "主办：XX 协会 · 全校同学均可参加"
}
```

- `brand.letters`：2~4 个字母色块（含表情脸），替代原版 HDD logo；`colors` 取 blue/red/orange/yellow。
- `lines`：4~6 行正文，自动配左右花括号。
- `mascot`：`robot`（AI 机器人）/`panda-desk`（桌前办公熊猫）。
- `qr.image`：可选，data URI 图片会覆盖占位码。

## 3. 模板二：`template-long.html`（750 宽长图）

```json
{
  "brand": {...}, "title": "长图主标题", "kicker": "号召语，如：各位同学！",
  "sections": [
    { "type": "banner", "title": "技术干货 深度解码", "note": "可选小字" },
    { "type": "photo",  "title": "现场照片位", "caption": "图注", "scene": "classroom|code|agent" },
    { "type": "card",   "title": "卡片标题", "lines": ["说明 1", "说明 2"], "highlight": "关键词" },
    { "type": "info",   "items": [ { "k": "时间", "v": "10 月 31 日 19:00" } ] },
    { "type": "timeline","rows": [ { "t": "19:00", "e": "签到" } ] },
    { "type": "table",  "head": ["任务","负责","时间"], "rows": [ ["宣传","宣传部","D-12"] ] },
    { "type": "note",   "title": "茶歇说明", "lines": ["黄色便签，放提醒/说明"] }
  ],
  "footer": "落款"
}
```

长图高度 = 内容自动撑高（导出按实际高度出图）。同构卡片（`card`）重复 3~6 张是长图的节奏来源。

## 4. 模板三：`template-spotlight.html`（1080×1496 卖点对话框）

```json
{
  "brand":   { "letters": ["C","A","I"], "colors": ["blue","red","orange"], "bubbles": ["♥","</>"] },
  "org":     "XX 大学 XX 协会",
  "title":   "AI 讲座 × AI 会议",
  "lines": [
    { "text": "痛点问句？" },
    { "text": "主张句带关键词", "highlight": "关键词", "size": "big" },
    { "text": "收益句" }
  ],
  "mascot":  "panda-desk",
  "tail":    "right",
  "footer":  "10 月 31 日 19:00 · 教学楼 101 · 主办：XXX",
  "exportName": "卖点图"
}
```

- `org` 显示在标题上方小字，`title` 独占一行；两行各自写短，拼一行会被自动缩字号并告警。
- `lines` 2~4 行：第 1 行痛点问句（60px），第 2 行主张句 `size:"big"`（64px、关键词 `highlight` 蓝色），第 3 行收益句。全角当量：普通行 ≤13 字、大字行 ≤11 字。
- `tail`：对话气泡尾巴方向，`right`（右下）/ `left`（左下）。
- `mascot` 同模板一；panda-desk 的 viewBox 已裁到桌线，吉祥物贴气泡底部。

## 5. 模板四：`template-agenda.html`（930 宽议程长图）

```json
{
  "brand": { "letters": ["C","A","I"], "colors": ["blue","red","orange"], "bubbles": ["♥","</>"] },
  "title": "活动主标题（一行）",
  "badge": "场次徽章，如：两场连办 · 先上手再上台",
  "host":  "主办单位",
  "meta":  [ { "icon": "cal", "text": "10 月 31 日（周六）19:00–21:30" }, { "icon": "pin", "text": "教学楼 101" } ],
  "venue": [ "签到时间一行", "（具体教室见群公告）" ],
  "intro": { "label": "活动简介", "tone": "blue", "callout": "荧光笔高亮句",
    "cards": [ { "tone": "yellow", "label": "小标题", "icon": "code", "desc": "2~3 行正文", "foot": "*脚注" } ],
    "note": "*卡外脚注" },
  "proof": { "label": "活动证明", "tone": "orange", "cards": [ ...同 intro.cards... ], "note": "*茶歇等补充说明" },
  "agenda": { "label": "活动安排", "tone": "red", "rows": [
    { "title": "签到入场", "time": "18:30–19:00", "tone": "yellow" },
    { "title": "环节一", "time": "19:00–20:15", "tone": "blue", "num": 1, "talks": [
      { "tone": "blue", "title": "演讲标题", "speaker": "主讲：XXX", "bullets": ["要点 1", "要点 2"], "decor": "C" } ] }
  ] },
  "cta": { "qr": { "image": "", "seed": 20261031, "text": "扫码报名 · 教室号见群公告" }, "footer": "落款" },
  "exportName": "议程长图"
}
```

- `meta[].icon`：`cal`（📅）/`pin`（📍）；`venue` 1~2 行小字。
- `intro/proof` 是同一套「书签标签+白卡」区块，`cards` 2 张淡彩子卡（tone: yellow/blue/red/orange），`icon`: code/mic/star/check；放在 `intro` 或 `proof` 只决定顺序。
- `agenda.rows[]`：普通行（title+time+tone 时间胶囊）或环节行（`num` 数字圆徽）；`talks[]` 嘉宾卡挂在环节行下，`decor` 填 `brand.letters` 里的字母会在卡边贴品牌小色块（自动左右交错、文字自动避让）。
- 时间胶囊 tone 与子卡 tone 同四色；书签标签 tone 建议 blue/red/orange 三色轮换。
- 画布 930×自动高；装饰圆弧全部做在画布内，导出不会触发 overflow。

## 6. 模板五：`template-talk.html`（1080 宽单场介绍图）

单场活动介绍图：一场讲座、一场会议、一次分享各出一张，把「这一场讲什么、谁来讲、怎么参加」讲透。1080 宽、min-height 1920、内容多了自动加高。

```json
{
  "brand": { "letters": ["C","A","I","T"], "colors": ["blue","red","orange","yellow"] },
  "org": "XX 大学 XX 协会",
  "badge": "讲座段 · 16:00–16:48",
  "badgeTone": "blue",
  "title": "AI 工具上手第一课",
  "subtitle": "WorkBuddy 与 Trae 现场演示和基础知识教学",
  "meta": [
    { "icon": "⏰", "text": "10 月 31 日（周六）16:00–16:48" },
    { "icon": "📍", "text": "教学楼 101 教室" },
    { "icon": "👥", "text": "全校同学都能来" }
  ],
  "lead": "一句话说清这一场到底解决什么，2 行以内。",
  "pointsTitle": "现场讲什么",
  "pointsSub": "从认识工具到动手跑通",
  "points": [
    { "title": "要点标题（≤14 字）", "desc": "2~3 行说明，写具体动作，不写口号。" }
  ],
  "speakersTitle": "谁来讲",
  "speakersSub": "协会副会长主讲",
  "speakers": [
    { "name": "主讲人", "role": "身份 · 头衔 · 获奖（可 2 行）", "topic": "《演讲主题》" }
  ],
  "tail": "一句行动号召，荧光笔高亮",
  "qr": { "image": "data:image/png;base64,...", "title": "扫码进群 · 协会活动群", "desc": "教室号、演示资料和活动证明通知都发在群里" },
  "footer": "主办：XX 协会 · 全校同学均可参加",
  "exportName": "AI讲座与会议-讲座介绍图"
}
```

- **两个内容槽位**：`points`（讲什么，四色轮换的要点卡，左侧色条 + 编号方块）和 `speakers`（谁来讲，白卡 + 姓名首字头像 + 姓名/身份/主题）。讲座图用 `points` 铺满四张、`speakers` 放 1 张主讲；会议图把 `points` 留空、`speakers` 放 3~4 张演讲人，让讲者卡成为主体。
- `badge` 是场次胶囊（如「讲座段 · 16:00–16:48」），`badgeTone` 选 blue/red/orange，两场连办时用不同色区分。
- `meta` 2~4 条，每条一个 emoji 图标 + 一句话，自动换行成灰色胶囊条。
- `lead` 是副标题下方的一句话定位；`tail` 在二维码上方做荧光笔高亮收尾。
- `qr` 是单张二维码横条（淡黄底、码 150px），也可以改用 §7 的 `qrGroups` 尾块放多个群。
- 画布 1080 宽、min-height 1920，内容超出自动加高；导出同样走 2 倍分辨率。

## 7. 群二维码尾块与问卷条（五个模板通用，`qrGroups` 驱动）

活动海报末尾常需要「扫码进群」，而且可能不止一个群（领证明的协会群、聊 AI 的交流群）。五个模板都在内容末尾支持一段通用尾块，只要在 config 里加 `qrGroups`。

**多群时每条必须写清「加这个群能得到什么」**：`name` 写群名（含群号可选）、`desc` 写这个群的作用、`tag` 写一句「什么需求加这个」，再用 `pick` 兜一句总取舍。读者只该花 3 秒就知道自己该扫哪个。

```json
"qrGroups": {
  "head": "扫码进群 · 两个群，作用不一样",
  "sub": "只领活动证明加协会群；想一起交流 AI 再加第二个",
  "groups": [
    { "name": "协会活动群", "desc": "领活动证明、接收协会最新通知",
      "tag": "只领证明就加这个", "image": "data:image/png;base64,..." },
    { "name": "AI 交流群", "desc": "平时聊 AI、了解最新前沿消息",
      "tag": "想学 AI 加这个", "image": "data:image/png;base64,..." }
  ],
  "pick": "只领证明 → 加协会群就够了；想一起交流学习 AI → 再加第 2 个群",
  "survey": { "image": "data:image/png;base64,...", "title": "AI 基础与兴趣调研问卷",
    "desc": "第一次 AI 会议配套问卷，1 分钟填完，帮我们把后面活动的内容排得更对路。", "tag": "扫码填写" }
}
```

- `groups` 1~3 个：每个是一张卡（二维码 + 群名 + 作用说明 + 彩色标签胶囊），按顺序横排；`image` 填真实二维码 data URI（见 §11 生成法）。两个群时第 1 张蓝框、第 2 张橙框，天然区分「领证明」与「交流」两类诉求。
- **不要为了「精简」删掉某个群**：用户明确要求两个群都放时，删一个就是漏需求。宁可加长画布（模板自动 min-height 撑高），也不要合并成一句「两个群都加」。
- **落款写哪儿都行，但别只写在一个会被跳过的分支里**：模板的落款渲染已做兜底——`var _ft=(cfg.cta&&cfg.cta.footer)||cfg.footer;`，所以 `footer` 放顶层或放 `cta` 对象里都能出。反过来说，如果某个模板的落款只在 `if(!cfg.qrGroups)` 分支内渲染（早期议程长图就是这样），配了双群尾块落款就会整段消失——改模板时务必把落款渲染放在 qrGroups 之后并保留这个兜底。
- **配了 `qrGroups` 就不要再放单码**：模板已内置互斥——promo 的 hero 单码卡、agenda 的 cta 单码块都会在检测到 `qrGroups` 时自动跳过（promo 的 CTA 改渲染蓝色胶囊按钮）。改模板时别拆掉这个判断，否则同一个群码会在图上出现两次，`verify-qr.py` 会解出重复 URL 抓出来。
- `pick`：可选，底部一条淡黄底取舍提示，写清「什么需求加哪个群」，别让读者自己猜。
- `survey`：可选，通栏问卷条（左二维码 + 右标题/说明/标签），适合活动前后收集反馈；**不要**硬塞成第三张群卡，窄画布会挤爆。
- 模板会自动把尾块接在 footer/cta 之后，并把 `#poster` 的固定高度改成 `min-height`，不会裁掉尾块。

## 8. 选型决策表（按活动类型挑模板）

| 你要做什么 | 模板 | 关键配置 |
| --- | --- | --- |
| 活动主宣传 / 招新 / 比赛预告（定时间地点报名） | template-promo | title 10~12 字 + lines 5 行槽位（亮点→时间→地点→福利→CTA）+ dateSticker + qr |
| 卖点图 / 朋友圈传播图（只讲一个主张） | template-spotlight | lines 3 行：痛点问句 → 主张句(highlight) → 收益句；一图一个 CTA |
| 论坛 / 讲座 / 会议议程长图（时间轴+嘉宾+证明规则） | template-agenda | intro/proof 两张信息卡 + agenda.rows 时间轴（num 环节 + talks 嘉宾卡） |
| 干货 / 流程 / 任务分工长图 | template-long | sections 里 3~6 张同构 card + info / timeline / table |
| 单场讲座 / 单场会议介绍图（讲什么、谁讲、怎么参加） | template-talk | badge 场次胶囊 + points 要点卡（讲座用）+ speakers 讲者卡（会议用）+ qr 单码横条 |
| 既要报名又要讲清楚规则 | 出两张：promo + long | 别挤一张（COPYWRITING.md §1） |
| 要引导进群 / 加问卷 | 任意模板 + `qrGroups` | 两个群写清各自作用 + `pick` 取舍提示；问卷用 `qrGroups.survey` 通栏条 |

## 9. 导出接口（内置，无需任何库）

页面暴露两个全局函数（`file://` 下可用，无外部依赖、无网络请求）：

- `window.__exportJPG({ scale=2, quality=0.92, filename='poster.jpg', returnDataUrl=false })`
  → 用 SVG foreignObject 把海报 DOM 栅格化到 canvas，输出 **JPEG**；`returnDataUrl:true` 时返回 data URI（自动化用），否则直接触发下载。返回 `{ok,width,height,bytes}`。
- `window.__posterReport()` → `{width,height,overflow:[...],shrunk:[...]}`：`overflow` 列出超出画布或被裁切的元素；`shrunk` 列出被 fitText 自动压缩字号的文字行（含 `fit:"60→48"` 压缩幅度），两者都应为空。

**实现约束（保证导出稳定，改样式时别破）**：图片必须 data URI 内联；不引网络字体（用系统字体栈）；不用 CSS filter / mix-blend-mode / backdrop-filter；不放视频与 iframe。导出画布底色强制填白（JPEG 无透明通道）。

## 10. 质检清单（每次出图必做，逐项过）

1. 用 `read_image` 打开导出的 JPG（不是看 HTML），逐项核对：
   - [ ] 标题无截断、无压字；正文每行 ≤ 16 字且无折行错位；
   - [ ] 画布四边留白 ≥ 60px，无元素贴边/溢出；
   - [ ] 颜色只出现在色块与关键词；正文黑白；黄底黑字、蓝底白字；
   - [ ] 贴纸/二维码/吉祥物三件套齐全且不互相遮挡；二维码区无文字压盖；
   - [ ] 长图：卡片间距一致、卡片标题条宽度一致、无孤行。
2. `node assets/verify-export.mjs 海报.html 海报.jpg 2` 返回 `ok:true` 且 `overflow=[]`、`shrunk=[]`。`shrunk` 非空 = 有行被 fitText 压缩字号（视觉上比别行小），按 `COPYWRITING.md` 改短文案或调大该槽位字号后重导。
3. **二维码必须解码核对**：`python assets/verify-qr.py 海报.jpg --segments 8 --expect <真实URL>`（可重复 `--expect`）必须把每个码都解出预期地址、`exit 0`。**光看图上是不是黑白方块没用** —— 早期示例码、残留的 `qr.image`/`cta.qr.image` 也是黑白方块，只有解出 URL 才算验证通过。依赖 `pip install zxing-cpp Pillow`；OpenCV/jsQR 对带中心 logo 的群码常解不出，以 zxing-cpp 为准。
4. **长图先切片再看**：导出图单边超过 8192px 时 `read_image` 打不开（报 `at least one image side exceeds the 8192px limit`），先 `python assets/qc-split.py 海报.jpg 3` 切成 3 段降采样审阅片，再逐段核对。
5. 导出分辨率 ≥ 2 倍画布；JPG 体积 200KB~3MB 之间（超了降 quality 到 0.85）。
6. 文案终检：无"赋能/路径落地/持续复盘/收束/把 A 转化为 B"这类空话；数字、日期、地点与策划案一致。

## 11. 常见问题

- **导出的图是空白/丢字**：检查是否用了外链图片或网络字体；把图片转 data URI，字体换系统栈后重导。
- **JPG 里文字发虚**：提高 `scale`（2~3）；保证导出前页面没有 `transform` 压缩（模板已处理）。
- **中文换行位置难看**：改 `lines` 拆句；标题控制在一行；必要时在 `<style>` 调字距。
- **报告出现 shrunk /「文字被 fitText 压缩」**：某行文案超出槽位被自动缩字号了。按 `COPYWRITING.md` 改短（每行 ≤16 字），或把该行字号区间调大后重导；60→58 这种 2px 级压缩可接受，60→48 必须改文案。
- **需要真实二维码**：`python assets/make-qr.py "https://报名链接" 报名码.png 372`，产出 PNG 和 `报名码.datauri.txt`，把 data URI 整行填进 `qr.image`；占位码只用于草稿。依赖 `pip install segno Pillow`。
- **图上二维码看着像码、扫不出来**：先用 `python assets/verify-qr.py 海报.jpg` 解码看指向哪。若解出的是示例码或别的旧链接，说明配置里还有残留的 `qr.image` / `cta.qr.image`（换群码时只改了 `qrGroups` 忘了它）；把该字段也换成真实 data URI，或直接删掉该字段只留 `qrGroups`。
- **长图导出特别大**：长图 scale 用 1.5~2，quality 0.85。单边超过 8192px 的 JPG `read_image` 读不了（工具上限），用 `python assets/qc-split.py 海报.jpg` 切片质检；只影响审阅方式，不影响发布原图。
- **品牌色块把机构名/标题压住、或几个色块互相重叠**：模板里色块容器尺寸（如 `.brand-block{width:148px}`）和 SVG 自带的 `width="220"` 不一致，SVG 会按 220px 原始尺寸溢出容器。每个模板的 `.brand-block` 后面都必须有 `.brand-block svg{width:100%;height:100%;display:block;}`（或像 template-long 那样把尺寸当参数传给 `brandBlockSVG`）。新加模板/改尺寸时先查这条。
- **用户发来的截图找不到文件**：聊天里粘贴的图片不进桌面/下载目录，而是按 sha256 存在 `~/.dsh/attachments/v1/objects/<sha256前两位>/<完整sha256>`。用消息里给的 sha256 直接定位，别去扫 `~/Desktop`、`~/Downloads`。
- **抠出来的码上带残影/压痕**：按「非白像素投影」算 bbox 时，群名文字和卡片分隔线会被算进外接框，码顶就会出现一道深色残痕（虽然还能扫，但印在海报上很脏）。改用 `zxingcpp.read_barcodes(img)[0].position` 的四个角点（`top_left/top_right/bottom_right/bottom_left`，注意是 `.x/.y` 属性、不是可迭代元组）求外接框，再向外扩 6% 静区裁正方形，四周补白到正方形后 LANCZOS 缩放。裁完必须再解码一次确认链接没变。
- **从群二维码截图里抠出干净的码**：QQ 群码是圆点风格 + 中心 logo，按「非白像素投影」求 bbox 会把群名文字、卡片边框一起算进去。可靠做法是用 zxing 先解码拿 `position` 四角坐标（`zxingcpp.read_barcodes(img)[0].position`），再按四角外扩 26px 裁正方形；裁完再解码一次确认。二值化用灰度阈值 205（QQ 圆点模块灰度约 150~200，阈值取 150 会整片压白），加白边后 NEAREST 缩到 420×420 再 `convert("1")`。**不要用 `convert("P", ADAPTIVE)` 存二维码**——调色板量化会变成彩色噪点，图上像码但扫不出来。

## 12. 目录约定

```
poster-studio/
├── SKILL.md               ← 本文件：工作流与接口
├── DESIGN-LANGUAGE.md     ← 设计语言拆解与 token（做图前读）
├── COPYWRITING.md         ← 中文文案规则 8 条（写文案前读）
└── assets/
    ├── template-promo.html     ← 1080×1920 主视觉模板（自包含）
    ├── template-spotlight.html ← 1080×1496 卖点对话框模板（自包含）
    ├── template-long.html      ← 750 宽长图模板（自包含）
    ├── template-agenda.html    ← 930 宽议程长图模板（自包含）
    ├── template-talk.html      ← 1080 宽单场介绍图模板（自包含）
    ├── verify-export.mjs       ← 无头浏览器导出/质检脚本（溢出+压缩双告警）
    ├── make-qr.py              ← 真实二维码生成（segno+Pillow，产 PNG+data URI）
    ├── verify-qr.py            ← 导出图二维码解码核对（zxing-cpp，可断言期望 URL）
    └── qc-split.py             ← 长图质检切片脚本（Pillow）
```

安装位置：`~/.dsh/skills/poster-studio/`（用户级 skill）。复制 `assets/template-*.html` 时连同其内联导出模块一起带走，模板本身即是成品工程。五个模板都内置 §7 的群二维码尾块与问卷条（`qrGroups`），不需要额外引入文件。

公开仓库：<https://github.com/MakeBlackSheepGreat/poster-studio>（MIT）。模板里的机构名、地点、二维码都是占位内容（`XX 大学 XX 协会`、`教学楼 101`、`data:image/png;base64,...`），发布前替换成自己的；二维码默认渲染占位图形，填真实 data URI 才会出真码。
