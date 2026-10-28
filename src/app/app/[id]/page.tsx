import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import { SiteHeader } from "@/components/site-header";
import { loadBoard } from "@/lib/load-board";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(params: Props["params"]) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return loadBoard(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const board = await load(params);
  return { title: board ? `${board.project.name} · Keyword Planner` : "Not found · Keyword Planner" };
}

export default async function BoardPage({ params }: Props) {
  const board = await load(params);
  if (!board) notFound();
  return (
    <>
      <SiteHeader>/ {board.project.name}</SiteHeader>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <BoardView appId={board.project.id} initialBoard={board} />
      </main>
    </>
  );
}
