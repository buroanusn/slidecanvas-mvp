#!/usr/bin/env node
/**
 * SlideCanvas MCP Server
 *
 * An MCP server that lets AI agents create, manage, and export HTML presentations.
 * All presentation data is stored as local files in a workspace directory.
 */
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile, readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { mkdirSync, existsSync } from "fs";
import { tiptapToSlidev } from "./lib/converter.js";
import { generateStandaloneHtml } from "./lib/html-exporter.js";
// ========== Workspace Management ==========
const DEFAULT_WORKSPACE = process.env.SLIDECANVAS_WORKSPACE ||
    join(process.env.HOME || "/tmp", ".slidecanvas", "projects");
function getWorkspace(projectId) {
    const dir = projectId ? join(DEFAULT_WORKSPACE, projectId) : DEFAULT_WORKSPACE;
    if (!existsSync(dir))
        mkdirSync(dir);
    return dir;
}
function createEmptyProject(title) {
    return {
        version: 1,
        title: title || "Untitled Presentation",
        editorContent: {
            type: "doc",
            content: [
                {
                    type: "heading",
                    attrs: { level: 1 },
                    content: [{ type: "text", text: title || "Untitled Presentation" }],
                },
                {
                    type: "paragraph",
                    content: [
                        { type: "text", text: "Created via SlideCanvas MCP" },
                    ],
                },
            ],
        },
        pageLayouts: { 0: "cover" },
        theme: "default",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
// ========== Server Creation ==========
const server = new McpServer({
    name: "slidecanvas",
    version: "1.0.0",
}, {
    instructions: [
        "SlideCanvas is an HTML presentation creation tool.",
        "",
        "Workflow:",
        "1. Use 'create_project' to create a new presentation",
        "2. Use 'add_slides' to add slide content (supports headings, bullets, code blocks)",
        "3. Use 'set_layout' or 'set_theme' to customize appearance",
        "4. Use 'ai_expand' to generate content continuations with AI",
        "5. Use 'export_markdown' to get Slidev-compatible Markdown",
        "6. Use 'export_html' to get a standalone HTML file",
        "7. Use 'list_projects' to see all projects",
        "8. Use 'save_project' to persist to disk",
        "",
        "Each project is stored as a JSON file. Slides are separated by H1 headings.",
    ].join("\n"),
});
// ========== Tool: List Projects ==========
server.registerTool("list_projects", {
    description: "List all SlideCanvas projects in the workspace. Returns project names and metadata.",
    inputSchema: {},
}, async () => {
    try {
        const wsDir = DEFAULT_WORKSPACE;
        if (!existsSync(wsDir)) {
            return { content: [{ type: "text", text: "No projects yet. Use create_project to start." }] };
        }
        const files = await readdir(wsDir);
        const projects = [];
        for (const f of files) {
            if (f.endsWith(".json")) {
                projects.push(f.replace(".json", ""));
            }
        }
        if (projects.length === 0) {
            return { content: [{ type: "text", text: "No projects found." }] };
        }
        const details = [];
        for (const p of projects) {
            try {
                const data = JSON.parse(await readFile(join(wsDir, p + ".json"), "utf-8"));
                const slideCount = countSlides(data.editorContent);
                details.push("- " + p + " (" + slideCount + " slides, theme: " + (data.theme || "default") + ")");
            }
            catch {
                details.push("- " + p + " (unreadable)");
            }
        }
        return { content: [{ type: "text", text: "Projects:\n" + details.join("\n") }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Create Project ==========
server.registerTool("create_project", {
    description: "Create a new SlideCanvas presentation project with a title. Returns the project ID.",
    inputSchema: {
        title: z.string().min(1).describe("Presentation title (used as H1 cover slide)"),
        project_id: z.string().optional().describe("Custom project ID (slug). If omitted, auto-generated from title."),
    },
}, async ({ title, project_id }) => {
    try {
        const id = project_id || title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "untitled";
        const wsDir = DEFAULT_WORKSPACE;
        if (!existsSync(wsDir))
            mkdirSync(wsDir);
        const filePath = join(wsDir, id + ".json");
        if (existsSync(filePath)) {
            return { content: [{ type: "text", text: "Project '" + id + "' already exists. Use a different project_id or load it first." }], isError: true };
        }
        const project = createEmptyProject(title);
        await writeFile(filePath, JSON.stringify(project, null, 2), "utf-8");
        return { content: [{ type: "text", text: "Project created: " + id + "\nTitle: " + title + "\nUse add_slides to add content." }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Load Project ==========
server.registerTool("load_project", {
    description: "Load an existing project and return its full content as JSON. Use this to inspect or modify a project.",
    inputSchema: {
        project_id: z.string().describe("Project ID to load"),
    },
}, async ({ project_id }) => {
    try {
        const filePath = join(DEFAULT_WORKSPACE, project_id + ".json");
        if (!existsSync(filePath)) {
            return { content: [{ type: "text", text: "Project '" + project_id + "' not found." }], isError: true };
        }
        const data = JSON.parse(await readFile(filePath, "utf-8"));
        const slideCount = countSlides(data.editorContent);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        project_id,
                        title: data.title,
                        slides: slideCount,
                        theme: data.theme,
                        layouts: data.pageLayouts,
                        content_preview: extractPlainText(data.editorContent).slice(0, 1000),
                    }, null, 2),
                }],
        };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Add Slides ==========
server.registerTool("add_slides", {
    description: "Add one or more slides to a project. Each slide starts with an H1 heading, followed by content blocks (paragraphs, bullet lists, code blocks). Returns the updated project summary.",
    inputSchema: {
        project_id: z.string().describe("Project ID"),
        slides: z.array(z.object({
            heading: z.string().describe("H1 slide title (triggers new page)"),
            subtitle: z.string().optional().describe("Optional subtitle/description below the heading"),
            bullets: z.array(z.string()).optional().describe("Bullet point items for this slide"),
            numbered: z.array(z.string()).optional().describe("Numbered list items"),
            code: z.object({ language: z.string(), content: z.string() }).optional().describe("Code block with language and content"),
        })).min(1).describe("Array of slides to add"),
    },
}, async ({ project_id, slides }) => {
    try {
        const project = await loadProject(project_id);
        for (const slide of slides) {
            // H1 heading (new slide)
            project.editorContent.content.push({
                type: "heading",
                attrs: { level: 1 },
                content: [{ type: "text", text: slide.heading }],
            });
            // Subtitle paragraph
            if (slide.subtitle) {
                project.editorContent.content.push({
                    type: "paragraph",
                    content: [{ type: "text", text: slide.subtitle }],
                });
            }
            // Bullet list
            if (slide.bullets && slide.bullets.length > 0) {
                project.editorContent.content.push({
                    type: "bulletList",
                    content: slide.bullets.map(item => ({
                        type: "listItem",
                        content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
                    })),
                });
            }
            // Numbered list
            if (slide.numbered && slide.numbered.length > 0) {
                project.editorContent.content.push({
                    type: "orderedList",
                    content: slide.numbered.map(item => ({
                        type: "listItem",
                        content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
                    })),
                });
            }
            // Code block
            if (slide.code) {
                project.editorContent.content.push({
                    type: "codeBlock",
                    attrs: { language: slide.code.language },
                    content: [{ type: "text", text: slide.code.content }],
                });
            }
        }
        project.updatedAt = new Date().toISOString();
        await saveProject(project_id, project);
        const totalSlides = countSlides(project.editorContent);
        return {
            content: [{
                    type: "text",
                    text: "Added " + slides.length + " slide(s) to '" + project_id + "'. Total: " + totalSlides + " slides.",
                }],
        };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Set Layout ==========
server.registerTool("set_layout", {
    description: "Set the layout for a specific slide page. Layouts: 'cover' (centered title), 'default' (standard), 'two-cols' (split).",
    inputSchema: {
        project_id: z.string().describe("Project ID"),
        page_index: z.number().int().min(0).describe("Zero-based page index"),
        layout: z.enum(["cover", "default", "two-cols"]).describe("Layout name"),
    },
}, async ({ project_id, page_index, layout }) => {
    try {
        const project = await loadProject(project_id);
        project.pageLayouts[page_index] = layout;
        project.updatedAt = new Date().toISOString();
        await saveProject(project_id, project);
        return { content: [{ type: "text", text: "Set page " + page_index + " layout to '" + layout + "' for project '" + project_id + "'." }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Set Theme ==========
server.registerTool("set_theme", {
    description: "Set the global theme for a presentation. Themes: 'default' (modern sans-serif), 'seriph' (elegant serif).",
    inputSchema: {
        project_id: z.string().describe("Project ID"),
        theme: z.enum(["default", "seriph"]).describe("Theme name"),
    },
}, async ({ project_id, theme }) => {
    try {
        const project = await loadProject(project_id);
        project.theme = theme;
        project.updatedAt = new Date().toISOString();
        await saveProject(project_id, project);
        return { content: [{ type: "text", text: "Set theme to '" + theme + "' for project '" + project_id + "'." }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: AI Expand ==========
server.registerTool("ai_expand", {
    description: "Use AI to expand or continue text for a presentation slide. Returns bullet-point style content suitable for slides. Requires OPENAI_API_KEY env var; falls back to simulated expansion.",
    inputSchema: {
        text: z.string().min(1).describe("The text to expand or continue"),
        context: z.string().optional().describe("Additional context about the presentation topic"),
    },
}, async ({ text, context }) => {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === "your-openai-api-key-here") {
            // Mock mode
            const lines = text.split(/[，。；\n]/).filter((s) => s.trim().length > 0);
            const bullets = [];
            for (const t of lines.slice(0, 3)) {
                const trimmed = t.trim();
                if (trimmed.length > 4)
                    bullets.push("- " + trimmed + ": detailed analysis of background and significance");
            }
            if (bullets.length === 0)
                bullets.push("- " + text.trim() + ": detailed explanation");
            bullets.push("- Verify with specific examples and data");
            bullets.push("- Summarize key conclusions and next steps");
            return { content: [{ type: "text", text: bullets.join("\n") + "\n(mock mode - set OPENAI_API_KEY for real AI)" }] };
        }
        const prompt = "You are a presentation writing assistant. Expand the following text into bullet-point style content suitable for slides.\n\nContext: " + (context || "general") + "\n\nText: " + text + "\n\nOutput bullet points only, one per line, concise:";
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
            body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 300, temperature: 0.7 }),
        });
        if (!res.ok) {
            return { content: [{ type: "text", text: "OpenAI API error: " + res.status }], isError: true };
        }
        const data = await res.json();
        const generated = data.choices?.[0]?.message?.content?.trim() || "";
        return { content: [{ type: "text", text: generated || "AI returned empty response." }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Export Markdown ==========
server.registerTool("export_markdown", {
    description: "Export a project as Slidev-compatible Markdown. The output can be used with any Slidev renderer.",
    inputSchema: {
        project_id: z.string().describe("Project ID to export"),
    },
}, async ({ project_id }) => {
    try {
        const project = await loadProject(project_id);
        const markdown = tiptapToSlidev(project.editorContent, {
            layouts: project.pageLayouts,
            theme: project.theme,
        });
        return { content: [{ type: "text", text: markdown }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Export HTML ==========
server.registerTool("export_html", {
    description: "Export a project as a fully self-contained single HTML file with inline CSS/JS. The file can be opened directly in a browser and shared with anyone. Returns the complete HTML source.",
    inputSchema: {
        project_id: z.string().describe("Project ID to export"),
        save_to_file: z.boolean().optional().describe("If true, also save to a .html file in the project directory"),
    },
}, async ({ project_id, save_to_file }) => {
    try {
        const project = await loadProject(project_id);
        const html = generateStandaloneHtml(project.editorContent, {
            layouts: project.pageLayouts,
            title: project.title,
        });
        if (save_to_file) {
            const wsDir = DEFAULT_WORKSPACE;
            const filePath = join(wsDir, project_id + ".html");
            await writeFile(filePath, html, "utf-8");
            return {
                content: [{
                        type: "text",
                        text: "HTML saved to: " + filePath + "\n\nFile size: " + (html.length / 1024).toFixed(1) + " KB\nSlides: " + countSlides(project.editorContent) + "\n\nTo open: open " + filePath + " in your browser.",
                    }],
            };
        }
        // Return HTML (truncated if too long for LLM context)
        if (html.length > 50000) {
            const savePath = join(DEFAULT_WORKSPACE, project_id + ".html");
            await writeFile(savePath, html, "utf-8");
            return {
                content: [{
                        type: "text",
                        text: "HTML is too large for inline return (" + (html.length / 1024).toFixed(0) + " KB). Saved to: " + savePath + "\n\nFirst 2000 chars:\n" + html.slice(0, 2000) + "\n... (truncated)",
                    }],
            };
        }
        return { content: [{ type: "text", text: html }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Save Project ==========
server.registerTool("save_project", {
    description: "Persist the current project state to disk. Called automatically by most tools, but can be called explicitly.",
    inputSchema: {
        project_id: z.string().describe("Project ID"),
    },
}, async ({ project_id }) => {
    try {
        const filePath = join(DEFAULT_WORKSPACE, project_id + ".json");
        if (!existsSync(filePath)) {
            return { content: [{ type: "text", text: "Project '" + project_id + "' not found." }], isError: true };
        }
        // Already saved by other tools; just confirm
        const fileStat = await stat(filePath);
        return { content: [{ type: "text", text: "Project '" + project_id + "' saved at " + fileStat.mtime.toISOString() }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Tool: Delete Project ==========
server.registerTool("delete_project", {
    description: "Delete a project and all its files from the workspace.",
    inputSchema: {
        project_id: z.string().describe("Project ID to delete"),
    },
}, async ({ project_id }) => {
    try {
        const jsonPath = join(DEFAULT_WORKSPACE, project_id + ".json");
        const htmlPath = join(DEFAULT_WORKSPACE, project_id + ".html");
        let deleted = [];
        if (existsSync(jsonPath)) {
            await unlink(jsonPath);
            deleted.push(".json");
        }
        if (existsSync(htmlPath)) {
            await unlink(htmlPath);
            deleted.push(".html");
        }
        if (deleted.length === 0) {
            return { content: [{ type: "text", text: "Project '" + project_id + "' not found." }], isError: true };
        }
        return { content: [{ type: "text", text: "Deleted project '" + project_id + "' (files: " + deleted.join(", ") + ")." }] };
    }
    catch (error) {
        return { content: [{ type: "text", text: "Error: " + (error instanceof Error ? error.message : String(error)) }], isError: true };
    }
});
// ========== Resource: Project Data ==========
server.registerResource("project-list", "slidecanvas://projects", {
    title: "All Projects",
    description: "List of all SlideCanvas projects with metadata",
    mimeType: "application/json",
}, async (uri) => {
    const wsDir = DEFAULT_WORKSPACE;
    if (!existsSync(wsDir)) {
        return { contents: [{ uri: uri.href, text: "[]" }] };
    }
    const files = await readdir(wsDir);
    const projects = [];
    for (const f of files) {
        if (f.endsWith(".json")) {
            try {
                const data = JSON.parse(await readFile(join(wsDir, f), "utf-8"));
                projects.push({
                    id: f.replace(".json", ""),
                    title: data.title,
                    slides: countSlides(data.editorContent),
                    theme: data.theme,
                    updated_at: data.updatedAt,
                });
            }
            catch { /* skip */ }
        }
    }
    return { contents: [{ uri: uri.href, text: JSON.stringify(projects, null, 2) }] };
});
server.registerResource("project-data", new ResourceTemplate("slidecanvas://project/{projectId}", {
    list: async () => {
        const wsDir = DEFAULT_WORKSPACE;
        if (!existsSync(wsDir))
            return { resources: [] };
        const files = await readdir(wsDir);
        return {
            resources: files
                .filter(f => f.endsWith(".json"))
                .map(f => ({ uri: "slidecanvas://project/" + f.replace(".json", ""), name: f.replace(".json", "") })),
        };
    },
}), {
    title: "Project Data",
    description: "Full project data as JSON",
    mimeType: "application/json",
}, async (uri, { projectId }) => {
    const filePath = join(DEFAULT_WORKSPACE, projectId + ".json");
    if (!existsSync(filePath)) {
        return { contents: [{ uri: uri.href, text: '{"error": "not found"}' }] };
    }
    const data = await readFile(filePath, "utf-8");
    return { contents: [{ uri: uri.href, text: data }] };
});
// ========== Prompt: Create Presentation ==========
server.registerPrompt("create-presentation", {
    title: "Create a Presentation",
    description: "Guided workflow to create a complete SlideCanvas presentation from a topic outline",
    argsSchema: {
        topic: z.string().describe("Presentation topic"),
        audience: z.string().optional().describe("Target audience description"),
        slide_count: z.number().optional().describe("Approximate number of slides"),
    },
}, ({ topic, audience, slide_count }) => ({
    messages: [
        {
            role: "user",
            content: {
                type: "text",
                text: [
                    "Create a SlideCanvas presentation about: " + topic,
                    audience ? "Target audience: " + audience : "",
                    slide_count ? "Target: ~" + slide_count + " slides" : "",
                    "",
                    "Steps:",
                    "1. create_project with a compelling title",
                    "2. add_slides with structured content for each slide (heading + bullets)",
                    "3. set_layout 'cover' for the first slide",
                    "4. set_theme based on topic formality",
                    "5. export_html with save_to_file=true",
                    "",
                    "Make each slide concise: one heading + 3-5 bullet points.",
                ].filter(Boolean).join("\n"),
            },
        },
    ],
}));
// ========== Helper Functions ==========
async function loadProject(projectId) {
    const filePath = join(DEFAULT_WORKSPACE, projectId + ".json");
    if (!existsSync(filePath)) {
        throw new Error("Project '" + projectId + "' not found");
    }
    return JSON.parse(await readFile(filePath, "utf-8"));
}
async function saveProject(projectId, project) {
    const wsDir = DEFAULT_WORKSPACE;
    if (!existsSync(wsDir))
        mkdirSync(wsDir);
    project.updatedAt = new Date().toISOString();
    await writeFile(join(wsDir, projectId + ".json"), JSON.stringify(project, null, 2), "utf-8");
}
function countSlides(json) {
    if (!json || !json.content)
        return 0;
    let count = 0;
    for (const node of json.content) {
        if (node.type === "heading" && node.attrs?.level === 1)
            count++;
    }
    return count || 1;
}
function extractPlainText(json) {
    if (!json)
        return "";
    if (json.type === "text")
        return json.text || "";
    if (json.content)
        return json.content.map(extractPlainText).join("\n");
    return "";
}
// ========== Start Server ==========
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("SlideCanvas MCP Server running on stdio");
    console.error("Workspace: " + DEFAULT_WORKSPACE);
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
