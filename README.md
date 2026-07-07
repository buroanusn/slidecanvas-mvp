# SlideCanvas

> 不用写代码，也能做出可以版本控制的 HTML 演示文稿。

[English](#english) | [中文](#中文)

---

## 中文

### 这是什么

做 PPT 最烦的几件事：改了十版找不到之前的版本、发给同事格式全乱、想自动化生成但 AI 输出的排版完全不可控。

SlideCanvas 想解决的就是这个——**比 PPT 更适合技术团队，比 Slidev 对普通人更友好**。

核心思路很简单：左边是块级编辑器（像 Notion 一样），右边实时预览幻灯片。写好的内容一键导出成独立的 HTML 文件，双击就能播放，发给别人也不用担心格式问题。还能接入 AI 帮你扩写内容，甚至直接用 Claude/TRAE 的 Agent 功能，说几句话就生成完整演示。

### 能做什么

| 功能 | 说明 |
|------|------|
| 块级编辑器 | H1 自动分页，支持标题、列表、代码块，工具栏实时显示当前块类型 |
| 实时预览 | 右侧 iframe 实时渲染 Slidev 幻灯片 |
| 布局/主题 | 每页可选封面/标准/双栏布局，默认/衬线两种主题 |
| AI 扩写 | 选中文字一键生成 bullet point，无 Key 也能用模拟模式 |
| 导出 HTML | 单文件、零依赖、双击播放，可发给任何人 |
| MCP 接入 | Claude / TRAE / Cursor 等 Agent 可直接调用创建演示 |

### 快速开始

```bash
git clone https://github.com/buroanusn/slidecanvas-mvp.git
cd slidecanvas-mvp
npm install

# 启动编辑器（端口 3000）
npm run dev

# 另开终端启动预览（端口 3031）
VITE_CACHE_DIR=/tmp/vite-cache-slidev npm run slidev -- --port 3031
```

打开 http://localhost:3000 即可使用。

### 项目结构

```
slidecanvas-mvp/
├── src/                          # Next.js 应用
│   ├── app/                      # 页面 + API 路由
│   ├── components/               # TipTap 编辑器组件
│   └── lib/                      # 转换器 + HTML 导出器
├── mcp/                          # MCP 服务器
│   ├── src/index.ts              # MCP Server 主文件
│   ├── src/lib/                  # 复用的转换器
│   └── dist/                     # 编译产物
├── slides/                       # Slidev 源文件
├── .trae/mcp.json                # TRAE 项目级 MCP 配置
├── .env.local.example            # 环境变量模板
└── package.json
```

### MCP 配置（让 AI 帮你做 PPT）

**Claude Desktop:**

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "slidecanvas": {
      "command": "node",
      "args": ["/absolute/path/to/slidecanvas-mvp/mcp/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key",
        "SLIDECANVAS_WORKSPACE": "~/.slidecanvas/projects"
      }
    }
  }
}
```

**TRAE:**

在项目根目录 `.trae/mcp.json` 中已包含配置，只需在 TRAE 设置中开启"项目级 MCP"即可。

**使用示例：**

> "帮我做一个关于 AI Agent 的演示，10 页左右，风格专业"

Agent 会自动调用 `create_project` → `add_slides` → `set_layout` → `export_html`，最后告诉你 HTML 文件保存到了哪里。

### 技术栈

Next.js 14 · TipTap · Slidev · Tailwind CSS · OpenAI GPT-4o-mini · MCP SDK

### 开发历程

| 时间 | 内容 |
|------|------|
| Day 1-2 | TipTap 编辑器 + JSON→Markdown 转换器 |
| Day 3-4 | 编辑器 → 保存 → Slidev 预览完整链路 |
| Day 5 | 布局系统（封面/标准/双栏）+ 主题切换 |
| Day 6 | localStorage 持久化 + 独立 HTML 导出 |
| Day 7 | AI 文本扩写（OpenAI + 降级模式） |
| Day 8 | MCP 服务器：10 个 Tools，支持 Agent 驱动演示创建 |

### License

MIT

---

## English

### What is this

The most annoying things about making presentations: losing track of versions after ten edits, formatting breaking when you send to colleagues, and AI-generated slides that look completely uncontrollable.

SlideCanvas solves this by being **more version-control-friendly than PowerPoint, and more approachable than Slidev**.

The idea is simple: a block editor on the left (like Notion), live slide preview on the right. Export to a standalone HTML file with one click — double-click to play, send to anyone without formatting issues. You can also use AI to expand your content, or just tell Claude/TRAE's Agent what you want and get a complete presentation.

### Features

| Feature | Description |
|---------|-------------|
| Block Editor | H1 auto-pagination, headings, lists, code blocks, with toolbar showing current block type |
| Live Preview | Real-time Slidev rendering in side iframe |
| Layouts & Themes | Cover/Default/Two-column per page, Default/Serif themes |
| AI Expansion | Select text to generate bullet points, works without API key (mock mode) |
| HTML Export | Single file, zero dependencies, double-click to play |
| MCP Support | Claude / TRAE / Cursor agents can create presentations via natural language |

### Quick Start

```bash
git clone https://github.com/buroanusn/slidecanvas-mvp.git
cd slidecanvas-mvp
npm install

# Start editor (port 3000)
npm run dev

# Start preview in another terminal (port 3031)
VITE_CACHE_DIR=/tmp/vite-cache-slidev npm run slidev -- --port 3031
```

Open http://localhost:3000 to start.

### Project Structure

```
slidecanvas-mvp/
├── src/                          # Next.js app
│   ├── app/                      # Pages + API routes
│   ├── components/               # TipTap editor component
│   └── lib/                      # Converters + HTML exporter
├── mcp/                          # MCP server
│   ├── src/index.ts              # MCP Server main file
│   ├── src/lib/                  # Reused converters
│   └── dist/                     # Compiled output
├── slides/                       # Slidev source files
├── .trae/mcp.json                # TRAE project-level MCP config
├── .env.local.example            # Env template
└── package.json
```

### MCP Setup (Let AI Make Your Slides)

**Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "slidecanvas": {
      "command": "node",
      "args": ["/absolute/path/to/slidecanvas-mvp/mcp/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-your-key",
        "SLIDECANVAS_WORKSPACE": "~/.slidecanvas/projects"
      }
    }
  }
}
```

**TRAE:**

Project-level MCP config is already in `.trae/mcp.json`. Just enable "Project-level MCP" in TRAE settings.

**Usage Example:**

> "Make me a presentation about AI Agents, around 10 slides, professional style"

The agent will call `create_project` → `add_slides` → `set_layout` → `export_html`, then tell you where the HTML file is saved.

### Tech Stack

Next.js 14 · TipTap · Slidev · Tailwind CSS · OpenAI GPT-4o-mini · MCP SDK

### Development Timeline

| Time | Milestone |
|------|-----------|
| Day 1-2 | TipTap editor + JSON→Markdown converter |
| Day 3-4 | Full pipeline: Editor → Save → Slidev preview |
| Day 5 | Layout system (Cover/Default/Two-column) + theme switching |
| Day 6 | localStorage persistence + standalone HTML export |
| Day 7 | AI text expansion (OpenAI + fallback mode) |
| Day 8 | MCP server: 10 Tools, agent-driven presentation creation |

### License

MIT
