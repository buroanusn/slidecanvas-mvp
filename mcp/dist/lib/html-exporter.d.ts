/**
 * TipTap JSON → 自包含 HTML 幻灯片
 * 所有 CSS/JS 内联，可直接双击打开
 */
export interface HtmlExportOptions {
    layouts?: Record<number, string>;
    title?: string;
}
export declare function generateStandaloneHtml(json: any, options?: HtmlExportOptions): string;
