/**
 * TipTap JSON → Slidev Markdown 转换器
 * 支持: heading, paragraph, bulletList, orderedList, codeBlock
 */

export interface ConverterOptions {
  layouts?: Record<number, string>;
  theme?: string;
}

export function tiptapToSlidev(json: any, options: ConverterOptions = {}): string {
  const { layouts = {}, theme = "default" } = options;
  if (!json || !json.content) return "";

  const slides: string[] = [];
  let currentSlide: string[] = [];

  for (const node of json.content) {
    if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      const text = extractText(node);
      if (level === 1 && currentSlide.length > 0) {
        slides.push(currentSlide.join("\n\n"));
        currentSlide = [];
      }
      currentSlide.push("#".repeat(level) + " " + text);
    } else if (node.type === "paragraph") {
      const text = extractText(node);
      if (text.trim()) {
        currentSlide.push(text);
      }
    } else if (node.type === "bulletList") {
      const items =
        node.content?.map((item: any) => {
          const text = extractText(item);
          return "- " + text;
        }) || [];
      currentSlide.push(items.join("\n"));
    } else if (node.type === "orderedList") {
      const items =
        node.content?.map((item: any, idx: number) => {
          const text = extractText(item);
          return idx + 1 + ". " + text;
        }) || [];
      currentSlide.push(items.join("\n"));
    } else if (node.type === "codeBlock") {
      const lang = node.attrs?.language || "";
      const code = extractText(node);
      currentSlide.push("```" + lang + "\n" + code + "\n```");
    }
  }

  if (currentSlide.length > 0) {
    slides.push(currentSlide.join("\n\n"));
  }

  return slides
    .map((s, i) => {
      const layout = layouts[i];
      const frontmatterLines = [];

      if (i === 0 && theme) {
        frontmatterLines.push(`theme: ${theme}`);
      }
      if (layout) {
        frontmatterLines.push(`layout: ${layout}`);
      }

      if (frontmatterLines.length > 0) {
        const frontmatter = "---\n" + frontmatterLines.join("\n") + "\n---";
        if (i === 0) {
          return frontmatter + "\n\n" + s;
        }
        return "---\n\n" + frontmatter + "\n\n" + s;
      }

      if (i === 0) return s;
      return "---\n\n" + s;
    })
    .join("\n\n");
}

function extractText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text || "";
  if (node.content) {
    return node.content.map(extractText).join("");
  }
  return "";
}
