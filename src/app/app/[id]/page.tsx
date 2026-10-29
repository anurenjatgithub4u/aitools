import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BoardView } from "@/components/board/board-view";
import { SiteHeader } from "@/components/site-header";
import { loadBoard } from "@/lib/load-board";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(params: Props["params"]) {
  const id = Number((await params).id);
  const user = await getCurrentUser();
  if (!user) return { id, board: null, signedOut: true };
  if (!Number.isInteger(id) || id <= 0) return { id, board: null, signedOut: false };
  return { id, board: await loadBoard(id, user.id), signedOut: false };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { board } = await load(params);
  // private boards: never in search results
  return { title: board ? board.project.name : "Project", robots: { index: false, follow: false } };
}

export default async function BoardPage({ params }: Props) {
  const { id, board, signedOut } = await load(params);
  if (signedOut) redirect(`/login?next=${encodeURIComponent(`/app/${id}`)}`);
  // someone else's project looks exactly like a missing one
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
