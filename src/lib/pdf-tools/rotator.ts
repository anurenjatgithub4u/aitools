// Client-side PDF rotation — runs entirely in the browser; nothing is uploaded.
// Uses pdf-lib (already a project dependency) to set page rotation.
// pdf-lib's page.setRotation() sets the /Rotate entry in the page dictionary,
// which is the canonical way to rotate pages in a PDF — every viewer respects it.

import { PDFDocument, degrees } from "pdf-lib";

export type RotationAngle = 90 | 180 | 270;

export interface RotateOptions {
  /** "all" rotates every page by the same angle; "custom" uses the perPage map */
  mode: "all" | "custom";
  /** Used when mode === "all" */
  angle?: RotationAngle;
  /** Used when mode === "custom": maps 1-based page index → additional degrees */
  perPage?: Map<number, RotationAngle>;
}

export interface RotateResult {
  blob: Blob;
  pageCount: number;
}

export async function rotatePdf(
  fileBytes: Uint8Array,
  opts: RotateOptions
): Promise<RotateResult> {
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: false });
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageNumber = i + 1; // 1-based

    let additionalAngle: RotationAngle | undefined;
    if (opts.mode === "all") {
      additionalAngle = opts.angle;
    } else {
      additionalAngle = opts.perPage?.get(pageNumber);
    }

    if (additionalAngle !== undefined) {
      // Get the current rotation and add to it, keeping it in [0, 360)
      const currentRotation = page.getRotation().angle;
      const newAngle = ((currentRotation + additionalAngle) % 360 + 360) % 360;
      page.setRotation(degrees(newAngle));
    }
  }

  const resultBytes = await pdfDoc.save();
  return {
    blob: new Blob([resultBytes.buffer as ArrayBuffer], { type: "application/pdf" }),
    pageCount: pages.length,
  };
}
