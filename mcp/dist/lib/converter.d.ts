/**
 * TipTap JSON → Slidev Markdown 转换器
 * 支持: heading, paragraph, bulletList, orderedList, codeBlock
 */
export interface ConverterOptions {
    layouts?: Record<number, string>;
    theme?: string;
}
export declare function tiptapToSlidev(json: any, options?: ConverterOptions): string;
