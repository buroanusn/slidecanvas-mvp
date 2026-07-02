/**
 * TipTap JSON → 自包含 HTML 幻灯片
 * 所有 CSS/JS 内联，可直接双击打开
 */

const STYLES = `
:root {
  --bg: #0f1117;
  --bg2: #161922;
  --ink: #e8eaf0;
  --muted: #8b92a8;
  --accent: #5eead4;
  --accent2: #38bdf8;
  --rule: #2a2e3b;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: 100%; height: 100%;
  background: var(--bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}
.slides {
  width: 100vw; height: 100vh;
  position: relative;
}
.slide {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 4rem 6rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.slide.active {
  opacity: 1;
  pointer-events: auto;
}
.slide-content {
  width: 100%;
  max-width: 1100px;
}
.slide h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: var(--accent);
  letter-spacing: -0.02em;
}
.slide h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--accent2);
}
.slide p {
  font-size: 1.25rem;
  line-height: 1.7;
  color: var(--muted);
  margin-bottom: 1rem;
}
.slide ul, .slide ol {
  font-size: 1.25rem;
  line-height: 1.8;
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}
.slide li {
  margin-bottom: 0.5rem;
}
.slide pre {
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.95rem;
  line-height: 1.5;
}
.slide code {
  font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
  color: var(--accent);
}
.slide pre code { color: inherit; }

/* Layout variants */
.layout-cover { text-align: center; }
.layout-cover h1 { font-size: 3.5rem; }
.layout-cover p { font-size: 1.5rem; }

.nav {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  z-index: 100;
  background: rgba(22, 25, 34, 0.9);
  border: 1px solid var(--rule);
  border-radius: 8px;
  padding: 0.5rem 1rem;
}
.nav button {
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--muted);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.nav button:hover { color: var(--ink); border-color: var(--accent); }
.nav .counter {
  color: var(--muted);
  font-size: 0.85rem;
  padding: 0.4rem 0.6rem;
  display: flex;
  align-items: center;
}
.progress {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: var(--rule);
  z-index: 100;
}
.progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}
`;

const SCRIPTS = `
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.slide');
  let current = 0;
  const total = slides.length;

  function show(i) {
    if (i < 0) i = 0;
    if (i >= total) i = total - 1;
    current = i;
    slides.forEach((s, idx) => s.classList.toggle('active', idx === current));
    document.getElementById('counter').textContent = (current + 1) + ' / ' + total;
    document.getElementById('progress').style.width = ((current + 1) / total * 100) + '%';
  }

  document.getElementById('prev').addEventListener('click', () => show(current - 1));
  document.getElementById('next').addEventListener('click', () => show(current + 1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(total - 1);
  });

  show(0);
});
`;

function extractText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return escapeHtml(node.text || "");
  if (node.content) return node.content.map(extractText).join("");
  return "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderNode(node: any): string {
  if (node.type === "heading") {
    const level = node.attrs?.level || 1;
    const tag = level <= 3 ? `h${level}` : "h3";
    return `<${tag}>${extractText(node)}</${tag}>`;
  }
  if (node.type === "paragraph") {
    return `<p>${extractText(node)}</p>`;
  }
  if (node.type === "bulletList") {
    const items = node.content?.map((item: any) => `<li>${extractText(item)}</li>`) || [];
    return `<ul>\n${items.join("\n")}\n</ul>`;
  }
  if (node.type === "orderedList") {
    const items = node.content?.map((item: any) => `<li>${extractText(item)}</li>`) || [];
    return `<ol>\n${items.join("\n")}\n</ol>`;
  }
  if (node.type === "codeBlock") {
    const code = extractText(node);
    return `<pre><code>${code}</code></pre>`;
  }
  return "";
}

export interface HtmlExportOptions {
  layouts?: Record<number, string>;
  title?: string;
}

export function generateStandaloneHtml(json: any, options: HtmlExportOptions = {}): string {
  const { layouts = {}, title = "SlideCanvas Presentation" } = options;

  if (!json || !json.content) {
    return `<!DOCTYPE html><html><body>No content</body></html>`;
  }

  const slides: string[] = [];
  let currentBlocks: string[] = [];
  let currentLayout = "default";

  for (let i = 0; i < json.content.length; i++) {
    const node = json.content[i];

    if (node.type === "heading" && node.attrs?.level === 1) {
      if (currentBlocks.length > 0) {
        slides.push(`<div class="slide layout-${currentLayout}"><div class="slide-content">${currentBlocks.join("\n")}</div></div>`);
      }
      currentBlocks = [renderNode(node)];
      currentLayout = layouts[slides.length] || "default";
    } else {
      currentBlocks.push(renderNode(node));
    }
  }

  if (currentBlocks.length > 0) {
    slides.push(`<div class="slide layout-${currentLayout}"><div class="slide-content">${currentBlocks.join("\n")}</div></div>`);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<div class="slides">
${slides.join("\n")}
</div>
<div class="nav">
  <button id="prev">◀ 上一页</button>
  <span class="counter" id="counter">1 / ${slides.length}</span>
  <button id="next">下一页 ▶</button>
</div>
<div class="progress"><div class="progress-bar" id="progress" style="width:0%"></div></div>
<script>${SCRIPTS}</script>
</body>
</html>`;
}
