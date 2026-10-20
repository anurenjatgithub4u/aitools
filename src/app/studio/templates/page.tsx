import type { Metadata } from "next";
import { Studio } from "../../_components/Studio";

export const metadata: Metadata = { title: "Templates — Reelforge" };

export default function StudioTemplatesPage() {
  return <Studio initialView="templates" />;
}
