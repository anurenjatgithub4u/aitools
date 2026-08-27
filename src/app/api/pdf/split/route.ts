import { NextRequest, NextResponse } from "next/server";
import { assertPdfShapedUpload, loadAndValidatePdf } from "@/lib/pdf-tools/validate";
import { PdfService } from "@/lib/pdf-tools/pdf-service";
import { checkRateLimit, resolveIdentity, respondWithError, respondWithFile } from "@/lib/pdf-tools/route-helpers";
import type { SplitRequestOptions } from "@/lib/pdf-tools/types";
import { PdfToolError } from "@/lib/pdf-tools/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF uploaded.", code: "invalid_file" }, { status: 400 });
    }
    assertPdfShapedUpload(file);

    const identity = await resolveIdentity(req, formData);
    const limited = await checkRateLimit(identity);
    if (limited) return limited;

    const optionsRaw = formData.get("options");
    if (typeof optionsRaw !== "string") {
      throw new PdfToolError("invalid_range", "Missing split options.");
    }
    let options: SplitRequestOptions;
    try {
      const parsed = JSON.parse(optionsRaw);
      if (!["extract", "every", "ranges"].includes(parsed.mode)) {
        throw new Error("bad mode");
      }
      options = parsed as SplitRequestOptions;
    } catch {
      throw new PdfToolError("invalid_range", "Invalid split options.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { doc } = await loadAndValidatePdf(bytes);
    const { payload, contentType, downloadName, meta } = await PdfService.split(doc, file.name, options);

    return respondWithFile(payload, contentType, downloadName, {
      "Page-Count": meta.pageCount,
      "Output-File-Count": meta.outputFileCount,
      "Is-Zip": meta.isZip,
    });
  } catch (e) {
    return respondWithError(e, "split");
  }
}
