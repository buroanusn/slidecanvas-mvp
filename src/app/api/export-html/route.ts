import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { generateStandaloneHtml } from "../../../lib/html-exporter";

export async function POST(request: NextRequest) {
  try {
    const { markdown, json, layouts, theme, title } = await request.json();

    // If markdown-only export (fallback for old clients)
    if (json) {
      const html = generateStandaloneHtml(json, {
        layouts: layouts || {},
        title: title || "SlideCanvas Presentation",
      });
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": 'attachment; filename="slides.html"',
        },
      });
    }

    if (typeof markdown !== "string") {
      return NextResponse.json(
        { success: false, error: "markdown must be a string" },
        { status: 400 }
      );
    }

    const cwd = process.cwd();
    const slidesPath = path.join(cwd, "slides", "slides.md");
    fs.writeFileSync(slidesPath, markdown, "utf-8");

    // Read the saved markdown and convert via the existing pipeline
    const mdContent = fs.readFileSync(slidesPath, "utf-8");
    return new NextResponse(mdContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="slides.md"',
      },
    });
  } catch (error: any) {
    console.error("Export HTML error:", error);
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
