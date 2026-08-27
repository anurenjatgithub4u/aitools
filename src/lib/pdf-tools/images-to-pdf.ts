"use client";

// JPG/PNG/WEBP → PDF, entirely client-side. Every image is decoded through
// a canvas regardless of its source format — that's what lets WEBP (which
// jsPDF can't embed directly) go through the exact same path as JPG/PNG,
// and it's the same normalize-via-canvas trick export-images.ts uses in the
// other direction (PDF → Image).

import jsPDF from "jspdf";

export type ImagePageSize = "fit" | "a4";

export interface ImagesToPdfResult {
  blob: Blob;
  pageCount: number;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
// Treat each image pixel as living on a 96 CSS-px/inch page — a reasonable,
// simple default (no embedded DPI metadata reading) that keeps "Fit to
// image" pages a sensible physical size rather than reproducing the exact
// pixel-to-mm ratio a print shop would use.
const PX_PER_MM = 96 / 25.4;

interface DecodedImage {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

function decodeImage(file: File): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas is not supported in this browser."));
        return;
      }
      // White background first — a transparent PNG/WEBP dropped onto a JPEG
      // PDF page would otherwise composite onto black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      URL.revokeObjectURL(url);
      resolve({ dataUrl, widthPx: canvas.width, heightPx: canvas.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't read "${file.name}" as an image.`));
    };
    img.src = url;
  });
}

export async function convertImagesToPdf(files: File[], pageSize: ImagePageSize): Promise<ImagesToPdfResult> {
  if (files.length === 0) throw new Error("Add at least one image.");

  let pdf: jsPDF | null = null;

  for (let i = 0; i < files.length; i++) {
    const decoded = await decodeImage(files[i]);

    if (pageSize === "fit") {
      const widthMm = decoded.widthPx / PX_PER_MM;
      const heightMm = decoded.heightPx / PX_PER_MM;
      if (!pdf) {
        pdf = new jsPDF({ orientation: widthMm >= heightMm ? "landscape" : "portrait", unit: "mm", format: [widthMm, heightMm] });
      } else {
        pdf.addPage([widthMm, heightMm], widthMm >= heightMm ? "landscape" : "portrait");
      }
      pdf.addImage(decoded.dataUrl, "JPEG", 0, 0, widthMm, heightMm);
    } else {
      if (!pdf) {
        pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      } else {
        pdf.addPage("a4", "portrait");
      }
      // Scale the image down to fit inside an A4 page with a small margin,
      // preserving aspect ratio, and center it.
      const margin = 10;
      const maxW = A4_WIDTH_MM - margin * 2;
      const maxH = A4_HEIGHT_MM - margin * 2;
      const aspect = decoded.widthPx / decoded.heightPx;
      let drawW = maxW;
      let drawH = drawW / aspect;
      if (drawH > maxH) {
        drawH = maxH;
        drawW = drawH * aspect;
      }
      const x = (A4_WIDTH_MM - drawW) / 2;
      const y = (A4_HEIGHT_MM - drawH) / 2;
      pdf.addImage(decoded.dataUrl, "JPEG", x, y, drawW, drawH);
    }
  }

  if (!pdf) throw new Error("Add at least one image.");
  return { blob: pdf.output("blob"), pageCount: files.length };
}
