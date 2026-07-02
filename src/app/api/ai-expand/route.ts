import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function generateMockExpansion(text: string): string {
  // 模拟扩写：根据输入生成几条 bullet point
  const lines = text.split(/[，。；\n]/).filter((s) => s.trim().length > 0);
  const bullets: string[] = [];

  if (lines.length === 0) {
    return "- 要点一：进一步阐述核心概念\n- 要点二：提供具体示例或数据支撑\n- 要点三：总结关键结论与下一步行动";
  }

  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const t = lines[i].trim();
    if (t.length > 4) {
      bullets.push(`- ${t}：深入分析其背景与意义`);
    }
  }

  if (bullets.length === 0) {
    bullets.push(`- ${text.trim()}：详细展开说明`);
  }

  bullets.push("- 通过具体案例验证上述观点");
  bullets.push("- 总结关键结论，明确后续行动方向");

  return bullets.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const { text, context } = await request.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "text is required" },
        { status: 400 }
      );
    }

    // 降级模式：未配置 Key 时返回模拟扩写
    if (!OPENAI_API_KEY || OPENAI_API_KEY === "your-openai-api-key-here") {
      const mock = generateMockExpansion(text);
      // 模拟延迟，让体验更真实
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({
        success: true,
        generated: "\n" + mock + "\n",
        mock: true,
      });
    }

    const prompt = `你是一位技术演讲写作助手。请根据以下上下文，续写或扩写一段适合演示文稿的内容。
要求：
- 语言简洁，适合演讲场合
- 使用 bullet point 形式，每条不超过一行
- 保持与原文风格一致
- 直接输出续写内容，不要解释

上下文：
${context || ""}

原文：
${text}

请续写（直接输出内容）：`;

    const res = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { success: false, error: err.error?.message || `OpenAI API error: ${res.status}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const generated = data.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ success: true, generated });
  } catch (error: any) {
    console.error("AI expand error:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
