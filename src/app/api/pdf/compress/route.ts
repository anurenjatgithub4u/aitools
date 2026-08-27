import { NextRequest, NextResponse } from "next/server";
import { assertPdfShapedUpload, loadAndValidatePdf } from "@/lib/pdf-tools/validate";
import { PdfService } from "@/lib/pdf-tools/pdf-service";
import { checkRateLimit, resolveIdentity, respondWithError, respondWithFile } from "@/lib/pdf-tools/route-helpers";
import type { CompressRequestOptions } from "@/lib/pdf-tools/types";
import { DEFAULT_COMPRESSION_LEVEL } from "@/lib/pdf-tools/config";

// The uploaded PDF is processed entirely in memory and never written to
// disk or storage — only the compressed bytes are returned. Nothing about
// the file survives past this request.

export const runtime = "nodejs";
export const maxDuration = 90; // image recompression is the slow part

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

    let options: CompressRequestOptions = { level: DEFAULT_COMPRESSION_LEVEL };
    const optionsRaw = formData.get("options");
    if (typeof optionsRaw === "string") {
      try {
        const parsed = JSON.parse(optionsRaw);
        options = {
          level: ["low", "recommended", "high"].includes(parsed.level) ? parsed.level : DEFAULT_COMPRESSION_LEVEL,
          advanced: parsed.advanced && typeof parsed.advanced === "object" ? parsed.advanced : undefined,
        };
      } catch {
        // Malformed options JSON just falls back to the default level.
      }
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { doc } = await loadAndValidatePdf(bytes);
    const { bytes: resultBytes, meta } = await PdfService.compress(bytes, doc, options);

    const downloadName = file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
    return respondWithFile(resultBytes, "application/pdf", downloadName, {
      "Original-Bytes": meta.originalBytes,
      "Result-Bytes": meta.resultBytes,
      "Page-Count": meta.pageCount,
      "Already-Optimized": meta.alreadyOptimized,
      "Images-Recompressed": meta.imagesRecompressed,
    });
  } catch (e) {
    return respondWithError(e, "compress");
  }
}
