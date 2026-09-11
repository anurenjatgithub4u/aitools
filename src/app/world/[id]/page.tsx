import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESTINATIONS, byId } from "@/world/destinations";
import { WorldView } from "./world-view";

// One static page per destination (output: "export").
export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = byId(id);
  return d ? { title: d.name, description: d.blurb } : {};
}

export default async function WorldPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!byId(id)) notFound();
  return <WorldView id={id} />;
}
