"use client";

// Browser-side helper for calling the PDF Utility API routes. Uses
// XMLHttpRequest rather than fetch specifically because it's the one
// reliably cross-browser way to get real upload-progress events (spec §4:
// "Do not show fake progress") — fetch has no standard upload-progress API.

export class PdfClientError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = "PdfClientError";
  }
}

export interface PdfToolFileResult {
  blob: Blob;
  downloadName: string;
  meta: Record<string, string>;
}

/**
 * POSTs a FormData payload and expects a binary file back (application/pdf
 * or application/zip), with result metadata in X-* response headers.
 * `onUploadProgress` fires with a 0-1 fraction during the upload phase only
 * — the server can't report real progress for the processing phase itself,
 * so callers should switch to an indeterminate indicator once this resolves
 * the upload and the promise is still pending.
 */
export function postPdfForFile(
  url: string,
  formData: FormData,
  onUploadProgress?: (fraction: number) => void
): Promise<PdfToolFileResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.responseType = "blob";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onUploadProgress) {
        onUploadProgress(e.loaded / e.total);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const blob = xhr.response as Blob;
        const meta = parseMetaHeaders(xhr.getAllResponseHeaders());
        const downloadName = parseFileName(xhr.getResponseHeader("Content-Disposition")) ?? "download.pdf";
        resolve({ blob, downloadName, meta });
        return;
      }

      // Error responses are JSON, but responseType is "blob" — read it back as text.
      try {
        const text = await (xhr.response as Blob).text();
        const parsed = JSON.parse(text) as { error?: string; code?: string };
        reject(new PdfClientError(parsed.error || "Something went wrong.", parsed.code));
      } catch {
        reject(new PdfClientError("We couldn't process this PDF. Please try again."));
      }
    };

    xhr.onerror = () => reject(new PdfClientError("Network error — please check your connection and try again."));
    xhr.onabort = () => reject(new PdfClientError("Upload cancelled."));

    xhr.send(formData);
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseMetaHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.trim().split(/[\r\n]+/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key.toLowerCase().startsWith("x-")) {
      out[key.slice(2).toLowerCase()] = value;
    }
  }
  return out;
}

function parseFileName(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  return plainMatch ? plainMatch[1] : null;
}
