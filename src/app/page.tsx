"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import TiptapEditor from "../components/TiptapEditor";
import { tiptapToSlidev, ConverterOptions } from "../lib/converter";

const SLIDEV_URL = "http://localhost:3031";
const SC_STORAGE_KEY = "slidecanvas-mvp-project";

const LAYOUTS = [
  { id: "cover", label: "封面", desc: "标题居中" },
  { id: "default", label: "内容", desc: "标准布局" },
  { id: "two-cols", label: "双栏", desc: "左右分栏" },
];

const THEMES = [
  { id: "default", label: "默认" },
  { id: "seriph", label: "衬线" },
];

export default function Home() {
  const [editorJson, setEditorJson] = useState<any>(null);
  const [markdown, setMarkdown] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageLayouts, setPageLayouts] = useState<Record<number, string>>({});
  const [theme, setTheme] = useState("default");
  const [autoSaved, setAutoSaved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SC_STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.pageLayouts) setPageLayouts(data.pageLayouts);
        if (data.theme) setTheme(data.theme);
        if (data.editorContent) setEditorJson(data.editorContent);
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (!editorJson) return;
    const data = {
      version: 1,
      editorContent: editorJson,
      pageLayouts,
      theme,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(SC_STORAGE_KEY, JSON.stringify(data));
    setAutoSaved(true);
    const timer = setTimeout(() => setAutoSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [editorJson, pageLayouts, theme]);

  const handleLayoutChange = (pageIndex: number, layout: string) => {
    setPageLayouts((prev) => ({ ...prev, [pageIndex]: layout }));
  };

  const handleRefreshPreview = useCallback(async () => {
    if (!editorJson) return;
    const options: ConverterOptions = { layouts: pageLayouts, theme };
    const md = tiptapToSlidev(editorJson, options);
    setMarkdown(md);
    setIsSaving(true);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: md }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSaved(new Date().toLocaleTimeString());
        if (iframeRef.current) {
          iframeRef.current.src = `${SLIDEV_URL}?t=${Date.now()}`;
        }
      } else {
        alert("保存失败: " + (data.error || "未知错误"));
      }
    } catch (err) {
      alert("网络错误，请确认 Slidev 服务是否运行");
    } finally {
      setIsSaving(false);
    }
  }, [editorJson, pageLayouts, theme]);

  const handleExportHtml = async () => {
    if (!editorJson) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/export-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: editorJson,
          layouts: pageLayouts,
          title: editorJson?.content?.[0]?.content?.[0]?.text || "Presentation",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("HTML 导出失败: " + (err.error || res.statusText));
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: "text/html; charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "slides.html";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("网络错误，请确认服务是否运行");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slides.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-400">SlideCanvas MVP</h1>
            <p className="text-gray-400 text-sm">
              Day 7 AI 辅助：选中文字，一键扩写
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={!markdown}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              下载 .md
            </button>
            <button
              onClick={handleExportHtml}
              disabled={!editorJson || isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            >
              导出 HTML
            </button>
            <button
              onClick={handleRefreshPreview}
              disabled={!editorJson || isSaving}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>刷新预览</>
              )}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-900/50 border border-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">第 {currentPage + 1} 页布局:</span>
            <select
              value={pageLayouts[currentPage] || "default"}
              onChange={(e) => handleLayoutChange(currentPage, e.target.value)}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300 focus:border-teal-500 focus:outline-none"
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
            <span className="text-xs text-gray-600 hidden sm:inline">
              {LAYOUTS.find((l) => l.id === (pageLayouts[currentPage] || "default"))?.desc}
            </span>
          </div>
          <div className="w-px h-5 bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">主题:</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-gray-300 focus:border-teal-500 focus:outline-none"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-xs text-gray-600">
            已设置 {Object.keys(pageLayouts).length} 页布局
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: "calc(100vh - 140px)" }}>
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">编辑器</h2>
            <div className="flex items-center gap-3">
              {lastSaved && (
                <span className="text-xs text-gray-500">上次保存: {lastSaved}</span>
              )}
              {autoSaved && (
                <span className="text-xs text-teal-500">✓ 已自动保存到本地</span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <TiptapEditor onUpdate={setEditorJson} onSelectionChange={setCurrentPage} initialContent={editorJson || undefined} />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Slidev 预览</h2>
            <span className="text-xs text-gray-500">{SLIDEV_URL}</span>
          </div>
          <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden bg-gray-900">
            <iframe
              ref={iframeRef}
              src={SLIDEV_URL}
              className="w-full h-full"
              title="Slidev Preview"
              allow="fullscreen"
            />
          </div>
        </div>
      </div>

      {markdown && (
        <div className="mt-6">
          <details className="border border-gray-700 rounded-lg">
            <summary className="px-4 py-2 bg-gray-900 cursor-pointer text-sm text-gray-400">
              查看生成的 Markdown 源码
            </summary>
            <pre className="p-4 text-xs text-gray-300 overflow-auto max-h-[300px] whitespace-pre-wrap">
              {markdown}
            </pre>
          </details>
        </div>
      )}
    </main>
  );
}
