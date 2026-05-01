declare module "mammoth/mammoth.browser" {
  export interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractRawTextResult>;
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: { styleMap?: string[]; convertImage?: unknown }
  ): Promise<ExtractRawTextResult>;
  export const images: {
    imgElement: (
      converter: (image: { contentType: string; read: (encoding: "base64") => Promise<string> }) => Promise<{ src: string }>
    ) => unknown;
  };
}
