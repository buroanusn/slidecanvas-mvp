"use client";

import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useState } from "react";

interface TiptapEditorProps {
  onUpdate?: (json: any) => void;
  onSelectionChange?: (pageIndex: number) => void;
  initialContent?: any;
}

function getCurrentPageIndex(editor: any): number {
  if (!editor) return 0;
  const { from } = editor.state.selection;
  let pageIndex = 0;
  editor.state.doc.descendants((node: any, pos: number) => {
    if (node.type.name === 'heading' && node.attrs.level === 1 && pos < from) {
      pageIndex++;
    }
  });
  return pageIndex;
}

export default function TiptapEditor({ onUpdate, onSelectionChange, initialContent }: TiptapEditorProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading" && node.attrs.level === 1) {
            return "输入大标题（每页幻灯片从这里开始）...";
          }
          if (node.type.name === "heading" && node.attrs.level === 2) {
            return "输入二级标题...";
          }
          return "输入正文，或输入 / 查看命令...";
        },
      }),
    ],
    content: initialContent || {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "SlideCanvas MVP 演示" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "这是副标题描述，介绍本次演示的核心内容。" },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "核心要点" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "基于 Novel + Slidev 的开源拼装方案" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "块级编辑器降低演示制作门槛" },
                  ],
                },
              ],
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "输出为可版本控制的 Markdown" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "代码示例" }],
        },
        {
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [{ type: "text", text: "function hello() {\n  console.log('Hello SlideCanvas!');\n}" }],
        },
      ],
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4",
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getJSON());
      }
      if (onSelectionChange) {
        onSelectionChange(getCurrentPageIndex(editor));
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionChange) {
        onSelectionChange(getCurrentPageIndex(editor));
      }
    },
  });

  const setHeading = useCallback(
    (level: number) => {
      editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
    },
    [editor]
  );

  const setParagraph = useCallback(() => {
    editor?.chain().focus().setParagraph().run();
  }, [editor]);

  const setBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const setOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const setCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const handleAiExpand = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const fullText = editor.state.doc.textContent;

    const textToExpand = selectedText || editor.state.doc.textBetween(Math.max(0, from - 100), from);
    if (!textToExpand.trim()) {
      alert("请先输入一些内容，或选中一段文字");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textToExpand,
          context: fullText.slice(0, 500),
        }),
      });
      const data = await res.json();
      if (data.success) {
        editor.chain().focus().insertContent(data.generated).run();
      } else {
        alert("AI 生成失败: " + (data.error || "未知错误"));
      }
    } catch (err) {
      alert("网络错误，请确认服务是否运行");
    } finally {
      setAiLoading(false);
    }
  };

  if (!editor) return <div className="p-4 text-gray-400">加载编辑器...</div>;

  const activeType = editor.isActive("heading", { level: 1 })
    ? "H1"
    : editor.isActive("heading", { level: 2 })
    ? "H2"
    : editor.isActive("heading", { level: 3 })
    ? "H3"
    : editor.isActive("bulletList")
    ? "列表"
    : editor.isActive("orderedList")
    ? "编号"
    : editor.isActive("codeBlock")
    ? "代码"
    : "正文";

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-900">
        <span className="text-xs text-gray-500 mr-2 hidden sm:inline">
          当前块: <strong className="text-teal-400">{activeType}</strong>
        </span>
        <div className="w-px h-5 bg-gray-700 mx-1 hidden sm:block" />

        <ToolbarButton
          onClick={() => setHeading(1)}
          active={editor.isActive("heading", { level: 1 })}
          label="H1"
          title="大标题 (分页点)"
        />
        <ToolbarButton
          onClick={() => setHeading(2)}
          active={editor.isActive("heading", { level: 2 })}
          label="H2"
          title="二级标题"
        />
        <ToolbarButton
          onClick={() => setHeading(3)}
          active={editor.isActive("heading", { level: 3 })}
          label="H3"
          title="三级标题"
        />
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <ToolbarButton
          onClick={setParagraph}
          active={editor.isActive("paragraph") && !editor.isActive("heading")}
          label="正文"
          title="普通段落"
        />
        <ToolbarButton
          onClick={setBulletList}
          active={editor.isActive("bulletList")}
          label="• 列表"
          title="无序列表"
        />
        <ToolbarButton
          onClick={setOrderedList}
          active={editor.isActive("orderedList")}
          label="1. 编号"
          title="有序列表"
        />
        <ToolbarButton
          onClick={setCodeBlock}
          active={editor.isActive("codeBlock")}
          label="</>"
          title="代码块"
        />
        <div className="w-px h-5 bg-gray-700 mx-1" />
        <button
          onClick={handleAiExpand}
          disabled={aiLoading}
          title="AI 扩写"
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 ${
            aiLoading
              ? "bg-purple-900/50 text-purple-300 cursor-wait"
              : "bg-purple-600 text-white hover:bg-purple-500"
          }`}
        >
          {aiLoading ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            <>AI 扩写</>
          )}
        </button>
      </div>

      <div className="px-3 py-1.5 bg-gray-800/50 border-b border-gray-700/50 text-xs text-gray-500">
        提示: 把光标放在某一行，再点击按钮，只会改变这一行的格式。H1 会作为新一页的开始。
      </div>

      <EditorContent editor={editor} />

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          shouldShow={({ editor }) => {
            return editor.isActive("paragraph") || editor.isActive("heading");
          }}
        >
          <div className="flex gap-1 bg-gray-800 border border-gray-600 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`px-2 py-1 text-xs rounded ${
                editor.isActive("bold")
                  ? "bg-teal-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              加粗
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`px-2 py-1 text-xs rounded ${
                editor.isActive("italic")
                  ? "bg-teal-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              斜体
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`px-2 py-1 text-xs rounded ${
                editor.isActive("strike")
                  ? "bg-teal-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              删除线
            </button>
          </div>
        </BubbleMenu>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  title,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition ${
        active
          ? "bg-teal-600 text-white shadow-sm"
          : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
