import { NextRequest, NextResponse } from "next/server";
import { extractPdfPages, PdfExtractionError } from "@/lib/pdf-study/extract-pdf";
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "@/lib/pdf-study/config";
import type { ExtractResponse } from "@/lib/pdf-study/types";

// The uploaded PDF is parsed in memory and never written to disk or storage —
// only the extracted text is returned. Nothing about the file survives this
// request, which is what the privacy copy on the page promises.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF uploaded." }, { status: 400 });
    }

    const isPdfType = file.type === "application/pdf" || file.type === "application/x-pdf";
    const isPdfName = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfType || !isPdfName) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: "This PDF appears to be empty." }, { status: 400 });
    }
    // Re-checked here even though the browser checks first — the client-side
    // check is a courtesy, this is the actual limit.
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: "This PDF is too large. Please upload a PDF smaller than 25 MB." },
        { status: 413 }
      );
    }

    const outcome = await extractPdfPages(file);

    const body: ExtractResponse = {
      meta: {
        fileName: file.name,
        pageCount: outcome.pageCount,
        byteSize: file.size,
        charCount: outcome.charCount,
        hasExtractableText: outcome.hasExtractableText,
        pageMappingReliable: outcome.pageMappingReliable,
      },
      pages: outcome.pages,
    };

    return NextResponse.json(body);
  } catch (e) {
    if (e instanceof PdfExtractionError) {
      // Page-count rejections are the user's to fix, so they keep their own
      // message; everything else gets the generic unreadable-file message.
      const status = e.message.includes(`${MAX_PDF_PAGES} pages`) ? 413 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    // Never leak parser internals or stack traces to the browser.
    console.error("[pdf-study] extract failed:", e);
    return NextResponse.json(
      { error: "We couldn't read this PDF. Please try another PDF." },
      { status: 500 }
    );
  }
}
