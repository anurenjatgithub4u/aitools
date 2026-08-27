import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { assertPdfShapedUpload, loadAndValidatePdf } from "@/lib/pdf-tools/validate";
import { PdfService } from "@/lib/pdf-tools/pdf-service";
import { checkRateLimit, resolveIdentity, respondWithError, respondWithFile } from "@/lib/pdf-tools/route-helpers";
import { PdfToolError, type MergeRequestOptions } from "@/lib/pdf-tools/types";
import { MAX_MERGE_FILES, MAX_MERGE_TOTAL_BYTES } from "@/lib/pdf-tools/config";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    // Order matters and is exactly the order the client appended them in —
    // this must match the order the user arranged in the reorderable list.
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (files.length < 2) {
      return NextResponse.json(
        { error: "Add at least two PDFs to merge.", code: "invalid_file" },
        { status: 400 }
      );
    }
    if (files.length > MAX_MERGE_FILES) {
      return NextResponse.json(
        { error: `You can merge up to ${MAX_MERGE_FILES} PDFs at once.`, code: "invalid_file" },
        { status: 400 }
      );
    }
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_MERGE_TOTAL_BYTES) {
      throw new PdfToolError(
        "too_large",
        `These files exceed the maximum combined size (${Math.round(MAX_MERGE_TOTAL_BYTES / (1024 * 1024))} MB).`,
        413
      );
    }
    files.forEach(assertPdfShapedUpload);

    const identity = await resolveIdentity(req, formData);
    const limited = await checkRateLimit(identity);
    if (limited) return limited;

    let options: MergeRequestOptions = {};
    const optionsRaw = formData.get("options");
    if (typeof optionsRaw === "string") {
      try {
        options = JSON.parse(optionsRaw);
      } catch {
        // Missing/invalid options just means the defaults (both off).
      }
    }

    const sources: { fileName: string; doc: PDFDocument }[] = [];
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { doc } = await loadAndValidatePdf(bytes);
      sources.push({ fileName: file.name, doc });
    }

    const { bytes, meta } = await PdfService.merge(sources, options);

    return respondWithFile(bytes, "application/pdf", "merged.pdf", {
      "File-Count": meta.fileCount,
      "Page-Count": meta.pageCount,
      "Result-Bytes": meta.resultBytes,
    });
  } catch (e) {
    return respondWithError(e, "merge");
  }
}
