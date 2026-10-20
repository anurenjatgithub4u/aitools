import type { Metadata } from "next";
import { Studio } from "../_components/Studio";

export const metadata: Metadata = { title: "Studio — FindUrAI" };

export default function StudioPage() {
  return <Studio />;
}
