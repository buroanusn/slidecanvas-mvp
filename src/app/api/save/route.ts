import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();
    if (typeof markdown !== "string") {
      return NextResponse.json(
        { success: false, error: "markdown must be a string" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "slides", "slides.md");
    fs.writeFileSync(filePath, markdown, "utf-8");

    return NextResponse.json({ success: true, path: filePath });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || String(error) },
      { status: 500 }
    );
  }
}
