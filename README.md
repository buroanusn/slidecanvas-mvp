# SlideCanvas MVP

> 一个基于 **Novel (TipTap)** + **Slidev** 的 HTML 演示文稿生成工具。  
> 通过块级富文本编辑器编写内容，自动转换为幻灯片，支持 AI 辅助扩写和一键导出独立 HTML。

[English](#english) | [中文](#中文)

---

## 中文

### 项目简介

**SlideCanvas** 解决了一个核心痛点：PowerPoint 不支持版本控制，Slidev 需要手写 Markdown 代码。  
SlideCanvas 提供可视化的块级编辑器，让用户通过表单交互编写演示文稿，同时输出可版本控制的 Markdown 和可分享的独立 HTML 文件。

**技术栈：**
- **编辑层** — [TipTap](https://tiptap.dev) 块级富文本编辑器（Novel 同款）
- **渲染层** — [Slidev](https://sli.dev) Markdown 幻灯片引擎
- **框架** — [Next.js 14](https://nextjs.org) App Router
- **样式** — [Tailwind CSS](https://tailwindcss.com)
- **AI** — OpenAI GPT-4o-mini（可选，支持无 Key 降级模式）

### 功能特性

- **块级编辑器** — 支持 H1（分页）、H2/H3、正文、有序/无序列表、代码块
- **实时预览** — 编辑内容通过 Markdown 转换后，在右侧 iframe 中实时预览 Slidev 幻灯片
- **布局系统** — 每页可独立设置封面 / 标准 / 双栏三种布局
- **主题切换** — 支持默认主题和衬线字体主题
- **AI 扩写** — 选中文字后一键调用 AI 生成 bullet point 风格的续写内容
- **自动保存** — 编辑器内容自动保存到浏览器 localStorage
- **Markdown 下载** — 导出 Slidev 兼容的 Markdown 文件
- **HTML 导出** — 生成完全自包含的单个 HTML 文件，所有 CSS/JS 内联，双击即可播放，可直接发送给任何人

### 项目结构

```
slidecanvas-mvp/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # 主页面（编辑器 + 预览双栏布局）
│   │   ├── layout.tsx                # 根布局
│   │   ├── globals.css               # 全局样式 + Tailwind
│   │   └── api/
│   │       ├── save/route.ts         # POST：保存 Markdown 到文件
│   │       ├── export-html/route.ts  # POST：导出独立 HTML / Markdown
│   │       └── ai-expand/route.ts    # POST：AI 文本扩写（OpenAI / 降级模式）
│   ├── components/
│   │   └── TiptapEditor.tsx          # TipTap 编辑器组件（工具栏 + BubbleMenu）
│   └── lib/
│       ├── converter.ts              # TipTap JSON → Slidev Markdown 转换器
│       └── html-exporter.ts          # TipTap JSON → 独立自包含 HTML 生成器
├── slides/
│   ├── slides.md                      # Slidev 源文件（由 API 动态写入）
│   └── dist/slides/                   # Slidev 静态构建产物
├── .env.local                         # 环境变量（OPENAI_API_KEY）
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

### 架构流程

```
┌─────────────────────────────────────────────────────┐
│                    page.tsx (主页面)                   │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │  TiptapEditor    │  │  Slidev iframe           │  │
│  │  (TipTap 富文本)  │  │  (localhost:3031)        │  │
│  └────────┬─────────┘  └────────────▲────────────┘  │
│           │ JSON                        │            │
│           ▼                            │ 读取        │
│     ┌─────────────┐    ┌───────────┐   │            │
│     │ converter.ts│───>│/api/save  │───┘            │
│     │ JSON→Slidev │    │ 写slides.md│               │
│     └─────────────┘    └───────────┘               │
│           │                                        │
│           ▼                                        │
│     ┌──────────────┐  ┌───────────────┐            │
│     │/api/export-html│ │/api/ai-expand │            │
│     │ JSON→独立HTML │  │OpenAI/模拟扩写│            │
│     └──────────────┘  └───────────────┘            │
│                                                      │
│  LocalStorage ◄── 自动保存 editorJson/layouts/theme │
└─────────────────────────────────────────────────────┘
```

### 快速开始

#### 环境要求

- Node.js >= 18
- npm >= 9

#### 安装与启动

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd slidecanvas-mvp

# 2. 安装依赖
npm install

# 3. 配置环境变量（可选，用于 AI 功能）
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 OPENAI_API_KEY

# 4. 启动 Next.js 开发服务器
npm run dev

# 5. 在另一个终端启动 Slidev 预览服务
VITE_CACHE_DIR=/tmp/vite-cache-slidev npm run slidev -- --port 3031
```

打开 http://localhost:3000 即可开始使用。

#### API Key 配置（可选）

编辑 `.env.local`，将 `OPENAI_API_KEY` 设置为你的 OpenAI API Key：

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

> 如果未配置 API Key，AI 扩写功能会自动使用降级模式（生成模拟扩写内容），不影响其他功能的使用。

### 使用说明

1. **编写内容** — 在左侧编辑器中使用工具栏切换块类型（H1 = 新幻灯片）
2. **选中扩写** — 选中一段文字后点击「AI 扩写」按钮，AI 会生成续写内容
3. **设置布局** — 使用顶部工具栏的布局选择器为当前页设置布局
4. **刷新预览** — 点击「刷新预览」按钮将内容保存并更新右侧 Slidev 预览
5. **导出文件** — 点击「导出 HTML」下载独立 HTML 文件，或「下载 .md」获取 Markdown

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| next | ^14.2 | React 全栈框架 |
| @tiptap/react | ^2.27 | 富文本编辑器 |
| @tiptap/starter-kit | ^2.27 | 编辑器基础扩展 |
| @slidev/cli | ^0.49 | 幻灯片渲染引擎 |
| @slidev/theme-default | ^0.25 | 默认主题 |
| @slidev/theme-seriph | ^0.25 | 衬线字体主题 |

### 开发历程

| 阶段 | 内容 |
|------|------|
| Day 1-2 | 最简技术验证：TipTap 编辑器 + JSON→Markdown 转换 |
| Day 3-4 | 串成链路：编辑器 → API 保存 → Slidev iframe 预览 |
| Day 5 | 加布局和主题：封面/标准/双栏布局 + 主题切换 |
| Day 6 | 导出与存储：localStorage 持久化 + 独立 HTML 导出 |
| Day 7 | AI 辅助：选中文字一键扩写（OpenAI + 降级模式） |
| Day 8 | MCP 服务器：开放完整 MCP 接口，支持 AI Agent 创建和导出演示文稿 |


### MCP 服务器（AI Agent 接入）

SlideCanvas 提供了完整的 MCP (Model Context Protocol) 服务器，任何支持 MCP 的 AI Agent（如 Claude Desktop、TRAE、Cursor 等）都可以通过它来创建和管理演示文稿。

#### 开放的 Tools

| 工具名 | 功能 | 关键参数 |
|--------|------|----------|
| `create_project` | 创建新演示项目 | title, project_id |
| `load_project` | 加载已有项目 | project_id |
| `add_slides` | 批量添加幻灯片（支持标题/列表/代码块） | project_id, slides[] |
| `set_layout` | 设置单页布局（cover/default/two-cols） | project_id, page_index, layout |
| `set_theme` | 设置全局主题（default/seriph） | project_id, theme |
| `ai_expand` | AI 扩写内容（bullet point 风格） | text, context |
| `export_markdown` | 导出为 Slidev Markdown | project_id |
| `export_html` | 导出为独立 HTML 文件 | project_id, save_to_file |
| `list_projects` | 列出所有项目 | - |
| `delete_project` | 删除项目 | project_id |

#### 快速配置

**1. 安装并构建**

```bash
cd mcp && npm install && npx tsc
```

**2. 配置到 Claude Desktop**

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

**3. 配置到 TRAE / 其他 MCP 客户端**

```json
{
  "slidecanvas": {
    "command": "node",
    "args": ["/absolute/path/to/slidecanvas-mvp/mcp/dist/index.js"]
  }
}
```

#### Agent 使用示例

1. 调用 `create_project` 创建项目（传入标题）
2. 调用 `add_slides` 添加幻灯片内容（每页一个 H1 标题 + 列表/代码）
3. 调用 `set_layout` 设置封面页布局为 cover
4. 调用 `export_html`（save_to_file=true）导出独立 HTML 文件

> 项目数据存储在本地文件系统，通过 `SLIDECANVAS_WORKSPACE` 环境变量控制存储路径。

### License

MIT

---

## English

### Overview

**SlideCanvas** bridges the gap between PowerPoint (no version control) and Slidev (requires writing Markdown code). It provides a visual block-based editor for creating presentations, while outputting version-controllable Markdown and shareable standalone HTML files.

**Tech Stack:**
- **Editor** — [TipTap](https://tiptap.dev) block-based rich text editor (same as Novel)
- **Renderer** — [Slidev](https://sli.dev) Markdown slide engine
- **Framework** — [Next.js 14](https://nextjs.org) App Router
- **Styling** — [Tailwind CSS](https://tailwindcss.com)
- **AI** — OpenAI GPT-4o-mini (optional, with graceful fallback mode)

### Features

- **Block Editor** — H1 (page break), H2/H3, paragraph, ordered/unordered lists, code blocks
- **Live Preview** — Content is converted to Markdown and previewed as Slidev slides in a side iframe
- **Layout System** — Per-page layout selection: Cover / Default / Two Columns
- **Theme Switching** — Default and Serif font themes
- **AI Expansion** — Select text and click to generate bullet-point style continuations via AI
- **Auto Save** — Editor content automatically persists to browser localStorage
- **Markdown Download** — Export Slidev-compatible Markdown files
- **HTML Export** — Generate fully self-contained single HTML files with inline CSS/JS, playable by double-clicking and shareable with anyone

### Project Structure

```
slidecanvas-mvp/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main page (editor + preview split layout)
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Global styles + Tailwind
│   │   └── api/
│   │       ├── save/route.ts         # POST: Save Markdown to file
│   │       ├── export-html/route.ts  # POST: Export standalone HTML / Markdown
│   │       └── ai-expand/route.ts    # POST: AI text expansion (OpenAI / fallback)
│   ├── components/
│   │   └── TiptapEditor.tsx          # TipTap editor component (toolbar + BubbleMenu)
│   └── lib/
│       ├── converter.ts              # TipTap JSON → Slidev Markdown converter
│       └── html-exporter.ts          # TipTap JSON → standalone HTML generator
├── slides/
│   ├── slides.md                      # Slidev source (dynamically written by API)
│   └── dist/slides/                   # Slidev static build output
├── .env.local                         # Environment variables (OPENAI_API_KEY)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                    page.tsx (Main Page)                │
│  ┌──────────────────┐  ┌─────────────────────────┐  │
│  │  TiptapEditor    │  │  Slidev iframe           │  │
│  │  (Rich Text)     │  │  (localhost:3031)        │  │
│  └────────┬─────────┘  └────────────▲────────────┘  │
│           │ JSON                        │            │
│           ▼                            │ reads       │
│     ┌─────────────┐    ┌───────────┐   │            │
│     │ converter.ts│───>│/api/save  │───┘            │
│     │ JSON→Slidev │    │ slides.md │               │
│     └─────────────┘    └───────────┘               │
│           │                                        │
│           ▼                                        │
│     ┌──────────────┐  ┌───────────────┐            │
│     │/api/export-html│ │/api/ai-expand │            │
│     │ JSON→HTML     │  │OpenAI/Mock    │            │
│     └──────────────┘  └───────────────┘            │
│                                                      │
│  LocalStorage ◄── Auto-saves json/layouts/theme      │
└─────────────────────────────────────────────────────┘
```

### Quick Start

#### Prerequisites

- Node.js >= 18
- npm >= 9

#### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd slidecanvas-mvp

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional, for AI features)
cp .env.local.example .env.local
# Edit .env.local and set your OPENAI_API_KEY

# 4. Start Next.js dev server
npm run dev

# 5. Start Slidev preview server in another terminal
VITE_CACHE_DIR=/tmp/vite-cache-slidev npm run slidev -- --port 3031
```

Open http://localhost:3000 to start using the app.

#### API Key Configuration (Optional)

Edit `.env.local` and set `OPENAI_API_KEY` to your OpenAI API key:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

> If no API key is configured, the AI expansion feature automatically falls back to mock mode (generating simulated expansion content). All other features work without any API key.

### Usage

1. **Write Content** — Use the toolbar in the left editor to switch block types (H1 = new slide)
2. **AI Expand** — Select text and click the "AI 扩写" button to generate continuations
3. **Set Layout** — Use the layout selector in the toolbar to set per-page layouts
4. **Refresh Preview** — Click "刷新预览" to save and update the Slidev preview on the right
5. **Export** — Click "导出 HTML" to download a standalone HTML file, or "下载 .md" for Markdown

### Key Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| next | ^14.2 | React full-stack framework |
| @tiptap/react | ^2.27 | Rich text editor |
| @tiptap/starter-kit | ^2.27 | Editor base extensions |
| @slidev/cli | ^0.49 | Slide rendering engine |
| @slidev/theme-default | ^0.25 | Default theme |
| @slidev/theme-seriph | ^0.25 | Serif font theme |

### Development Timeline

| Phase | Description |
|-------|-------------|
| Day 1-2 | Tech validation: TipTap editor + JSON→Markdown conversion |
| Day 3-4 | Full pipeline: Editor → API save → Slidev iframe preview |
| Day 5 | Layouts & themes: Cover/Default/Two-Columns + theme switching |
| Day 6 | Export & storage: localStorage persistence + standalone HTML export |
| Day 7 | AI assistant: Select text and one-click AI expansion (OpenAI + fallback) |
| Day 8 | MCP server: Full MCP interface for AI agents to create and export presentations |


### MCP Server (AI Agent Integration)

SlideCanvas provides a complete MCP (Model Context Protocol) server, enabling any MCP-compatible AI agent (Claude Desktop, TRAE, Cursor, etc.) to create and manage presentations programmatically.

#### Available Tools

| Tool | Description | Key Parameters |
|------|-------------|----------------|
| `create_project` | Create a new presentation project | title, project_id |
| `load_project` | Load an existing project | project_id |
| `add_slides` | Add slides (headings, bullets, code blocks) | project_id, slides[] |
| `set_layout` | Set page layout (cover/default/two-cols) | project_id, page_index, layout |
| `set_theme` | Set global theme (default/seriph) | project_id, theme |
| `ai_expand` | AI content expansion (bullet-point style) | text, context |
| `export_markdown` | Export as Slidev Markdown | project_id |
| `export_html` | Export as standalone HTML file | project_id, save_to_file |
| `list_projects` | List all projects | - |
| `delete_project` | Delete a project | project_id |

#### Quick Setup

**1. Install and build**

```bash
cd mcp && npm install && npx tsc
```

**2. Configure for Claude Desktop**

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

**3. Configure for TRAE / other MCP clients**

```json
{
  "slidecanvas": {
    "command": "node",
    "args": ["/absolute/path/to/slidecanvas-mvp/mcp/dist/index.js"]
  }
}
```

#### Agent Workflow Example

1. Call `create_project` with a title
2. Call `add_slides` to add content (each slide = H1 heading + bullets/code)
3. Call `set_layout` to set cover layout for the first page
4. Call `export_html` (save_to_file=true) to generate a standalone HTML file

> Project data is stored on the local filesystem. Use the `SLIDECANVAS_WORKSPACE` env var to control the storage path.

### License

MIT
