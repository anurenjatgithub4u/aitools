import type { Metadata } from "next";
import { Studio } from "../_components/Studio";

export const metadata: Metadata = { title: "Studio — Reelforge" };

export default function StudioPage() {
  return <Studio />;
}
