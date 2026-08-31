import { NextRequest, NextResponse } from "next/server";
import { assertPdfShapedUpload, loadAndValidatePdf } from "@/lib/pdf-tools/validate";
import { checkRateLimit, resolveIdentity, respondWithError, respondWithFile } from "@/lib/pdf-tools/route-helpers";
import type { ProtectRequestOptions } from "@/lib/pdf-tools/types";
import mupdf from "mupdf";

// The uploaded PDF is processed entirely in memory and never written to disk or
// storage — only the password-protected bytes are returned. Nothing about the
// file survives past this request.

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

    // Parse options
    let options: ProtectRequestOptions = { userPassword: "" };
    const optionsRaw = formData.get("options");
    if (typeof optionsRaw === "string") {
      try {
        const parsed = JSON.parse(optionsRaw) as Partial<ProtectRequestOptions>;
        if (typeof parsed.userPassword === "string" && parsed.userPassword.length > 0) {
          options = {
            userPassword: parsed.userPassword.slice(0, 128), // hard cap
            ownerPassword: typeof parsed.ownerPassword === "string" && parsed.ownerPassword.length > 0
              ? parsed.ownerPassword.slice(0, 128)
              : undefined,
          };
        }
      } catch {
        // Malformed JSON — fall through to validation error below
      }
    }

    if (!options.userPassword) {
      return NextResponse.json({ error: "A password is required.", code: "invalid_file" }, { status: 400 });
    }

    // Load and validate
    const bytes = new Uint8Array(await file.arrayBuffer());
    await loadAndValidatePdf(bytes); // validates not encrypted/corrupted/too many pages

    // Load document with mupdf
    const doc = mupdf.Document.openDocument(bytes, "application/pdf");
    const pdf = doc.asPDF();
    if (!pdf) {
      throw new Error("Failed to open document as PDF");
    }
    const pageCount = pdf.countPages();
    const ownerPassword = options.ownerPassword ?? options.userPassword;

    // Encrypt and save using mupdf saveToBuffer
    const encryptedBuf = pdf.saveToBuffer({
      encrypt: "aes-256",
      "user-password": options.userPassword,
      "owner-password": ownerPassword,
      permissions: 0 // Restrict printing, editing, copying by default
    });

    const resultBytes = encryptedBuf.asUint8Array();
    const downloadName = file.name.replace(/\.pdf$/i, "") + "-protected.pdf";
    return respondWithFile(resultBytes, "application/pdf", downloadName, {
      "Page-Count": pageCount,
      "Result-Bytes": resultBytes.length,
    });
  } catch (e) {
    return respondWithError(e, "protect");
  }
}
