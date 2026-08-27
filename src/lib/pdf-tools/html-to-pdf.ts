"use client";

// Shared HTML → PDF rendering core, used directly by the HTML to PDF tool
// and, via word-to-pdf.ts, by the Word to PDF tool. Same pattern already
// proven in this codebase (see src/lib/resume/export.ts's resume PDF
// export): html2canvas renders the DOM to a tall canvas, then that canvas is
// sliced into A4-height pages and dropped into a jsPDF document. Runs
// entirely in the browser — the HTML/DOCX content never leaves the device.
//
// Honest limitation: this is a screenshot-then-paginate approach, not a real
// print layout engine. It renders what the browser actually paints, so
// complex CSS (multi-column, print media queries, web fonts that fail to
// load), external resources blocked by CORS, and JavaScript-driven content
// won't come through perfectly. Good enough for real documents and reports;
// not a substitute for a browser's own "Print to PDF".

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  HTML_TO_PDF_FRAME_WIDTH_PX,
  HTML_TO_PDF_PAGE_WIDTH_MM,
  HTML_TO_PDF_PAGE_HEIGHT_MM,
} from "./config";

export interface HtmlToPdfResult {
  blob: Blob;
  pageCount: number;
}

/**
 * Renders an HTML *document* string (a full `<html>...</html>`, or any
 * fragment — it's dropped into an iframe's `srcdoc` either way) to a
 * multi-page A4 PDF. The iframe is sandboxed and removed afterwards; nothing
 * it references is fetched cross-origin except what the HTML itself points
 * to (images/fonts with their own URLs still load normally, same as pasting
 * the HTML into a new browser tab would do).
 */
export async function renderHtmlStringToPdf(html: string): Promise<HtmlToPdfResult> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "0";
  iframe.style.width = `${HTML_TO_PDF_FRAME_WIDTH_PX}px`;
  iframe.style.height = "0px";
  iframe.style.border = "0";
  // allow-same-origin is required for html2canvas to read the iframe's DOM;
  // no allow-scripts, so untrusted uploaded HTML can't run script against
  // the parent page — it's rendered, not executed with page-level trust.
  iframe.setAttribute("sandbox", "allow-same-origin");

  try {
    await new Promise<void>((resolve, reject) => {
      // Appending a freshly-created iframe fires an initial `load` for its
      // implicit about:blank document, *before* the srcdoc navigation we
      // actually care about completes — a well-known iframe gotcha. Ignore
      // that spurious first load and only resolve once the frame's URL is
      // no longer about:blank (confirmed by testing: without this check,
      // the code below ran against an empty about:blank body and every
      // capture attempt after it hung indefinitely).
      iframe.onload = () => {
        if (iframe.contentDocument?.URL === "about:blank") return;
        resolve();
      };
      iframe.onerror = () => reject(new Error("Failed to load HTML for rendering."));
      document.body.appendChild(iframe);
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    const body = doc?.body;
    if (!doc || !body) throw new Error("Could not read the uploaded HTML.");

    // Let images/fonts inside the frame finish loading before capturing —
    // srcdoc's load event fires once the HTML itself has parsed, not
    // necessarily once every referenced image has painted.
    await waitForImages(doc);

    // Full natural height of the content, however tall that turns out to be —
    // this is what gets sliced into pages below.
    body.style.margin = "0";
    const fullHeight = Math.max(body.scrollHeight, doc.documentElement.scrollHeight, 1);

    // The iframe itself starts at height:0 (nothing should be visible
    // pre-conversion) — resize it to the real content height before
    // capturing, and tell html2canvas the same height explicitly via
    // windowHeight, rather than letting it infer 0 from the frame's own
    // (pre-resize) box.
    iframe.style.height = `${fullHeight}px`;

    const canvas = await withTimeout(
      html2canvas(body, {
        width: HTML_TO_PDF_FRAME_WIDTH_PX,
        height: fullHeight,
        windowWidth: HTML_TO_PDF_FRAME_WIDTH_PX,
        windowHeight: fullHeight,
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      }),
      30_000,
      "Rendering this HTML took too long."
    );

    return sliceCanvasIntoPdf(canvas);
  } finally {
    iframe.remove();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          // A broken image shouldn't hang the whole export — move on.
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  ).then(() => undefined);
}

/** Same slice-a-tall-canvas-into-A4-pages algorithm as resume/export.ts. */
function sliceCanvasIntoPdf(canvas: HTMLCanvasElement): HtmlToPdfResult {
  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const imgWidth = HTML_TO_PDF_PAGE_WIDTH_MM;
  const pageHeight = HTML_TO_PDF_PAGE_HEIGHT_MM;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;
  let pageCount = 1;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    pageCount += 1;
  }

  return { blob: pdf.output("blob"), pageCount };
}
