// Real image recompression, not a cosmetic re-save. PDF file size is
// dominated by embedded images, so this walks every image XObject in the
// document, re-encodes JPEG-filtered ones through sharp at the chosen
// quality/resolution, and swaps the bytes back in place via
// `context.assign` — every page/Resources dict that already points at that
// object ref automatically picks up the new, smaller image.
//
// Scope (documented, not silently overstated): only single-filter
// DCTDecode (baseline JPEG) images without a soft mask are touched. That
// covers the dominant real-world case — scanned pages and embedded photos —
// which is also where the size actually lives. PNG/JPX-filtered images and
// masked images pass through untouched rather than risk corrupting
// transparency we can't safely re-derive. If nothing eligible is found, or
// the result isn't meaningfully smaller, the caller is told the PDF is
// already optimized instead of receiving a fake "compressed" file.

import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import sharp from "sharp";
import {
  COMPRESSION_PRESETS,
  MAX_IMAGE_QUALITY,
  MIN_IMAGE_QUALITY,
  MIN_MAX_DIMENSION,
  MAX_MAX_DIMENSION,
  MIN_MEANINGFUL_REDUCTION_RATIO,
} from "./config";
import type { CompressRequestOptions, CompressResultMeta } from "./types";

// Below this raw size a re-encode almost never wins once JPEG overhead and
// quality loss are accounted for — skip it and leave the image alone.
const MIN_IMAGE_BYTES_TO_ATTEMPT = 6 * 1024;

export async function compressPdf(
  bytes: Uint8Array,
  doc: PDFDocument,
  options: CompressRequestOptions
): Promise<{ bytes: Uint8Array; meta: CompressResultMeta }> {
  const preset = COMPRESSION_PRESETS[options.level] ?? COMPRESSION_PRESETS.recommended;
  const quality = clamp(
    options.advanced?.imageQuality ?? preset.jpegQuality,
    MIN_IMAGE_QUALITY,
    MAX_IMAGE_QUALITY
  );
  const maxDimension = clamp(
    options.advanced?.imageResolution ?? preset.maxDimensionPx,
    MIN_MAX_DIMENSION,
    MAX_MAX_DIMENSION
  );
  const grayscale = options.advanced?.grayscale ?? false;
  const removeMetadata = options.advanced?.removeMetadata ?? true;

  let imagesRecompressed = 0;
  const subtypeKey = PDFName.of("Subtype");
  const filterKey = PDFName.of("Filter");
  const imageName = PDFName.of("Image");
  const dctName = PDFName.of("DCTDecode");
  const smaskKey = PDFName.of("SMask");
  const maskKey = PDFName.of("Mask");

  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    if (dict.get(subtypeKey) !== imageName) continue;
    if (dict.get(filterKey) !== dctName) continue; // only single-filter baseline JPEG in v1
    if (dict.get(smaskKey) || dict.get(maskKey)) continue; // don't risk transparency

    const raw = obj.getContents();
    if (raw.length < MIN_IMAGE_BYTES_TO_ATTEMPT) continue;

    try {
      const pipeline = sharp(Buffer.from(raw)).rotate().resize({
        width: maxDimension,
        height: maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      });
      if (grayscale) pipeline.grayscale();
      const { data, info } = await pipeline
        .jpeg({ quality, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });

      // Only replace if this specific image actually shrank — never make an
      // individual image bigger just because the overall op ran.
      if (data.length >= raw.length * 0.97) continue;

      const newDict = doc.context.obj({
        Type: "XObject",
        Subtype: "Image",
        Width: info.width,
        Height: info.height,
        ColorSpace: grayscale ? "DeviceGray" : "DeviceRGB",
        BitsPerComponent: 8,
        Filter: "DCTDecode",
      });
      const newStream = PDFRawStream.of(newDict, data);
      doc.context.assign(ref, newStream);
      imagesRecompressed += 1;
    } catch {
      // One bad image shouldn't fail the whole document — leave it as-is.
      continue;
    }
  }

  if (removeMetadata) {
    try {
      doc.setTitle("");
      doc.setAuthor("");
      doc.setSubject("");
      doc.setKeywords([]);
      doc.setProducer("FindUrAI");
      doc.setCreator("FindUrAI");
    } catch {
      // Metadata stripping is best-effort — never fail the compression over it.
    }
  }

  const resultBytes = await doc.save({ useObjectStreams: true });
  const originalBytes = bytes.length;
  const meaningfullySmaller =
    resultBytes.length <= originalBytes * (1 - MIN_MEANINGFUL_REDUCTION_RATIO);

  const finalBytes = meaningfullySmaller ? resultBytes : bytes;

  return {
    bytes: finalBytes,
    meta: {
      originalBytes,
      resultBytes: finalBytes.length,
      pageCount: doc.getPageCount(),
      alreadyOptimized: !meaningfullySmaller,
      imagesRecompressed,
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
