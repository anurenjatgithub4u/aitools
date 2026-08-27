import type { Metadata } from "next"
import HomeClient from "@/components/home-client"
import { SITE_NAME } from "@/lib/seo"

export const metadata: Metadata = {
  // Absolute bypasses the "%s | FindurAI" template so the brand isn't doubled.
  title: { absolute: `${SITE_NAME} | Learn Anything with AI` },
  description:
    "Learn anything with AI. Turn any PDF, textbook chapter or document into notes, flashcards, questions and quizzes, practice until it sticks with reading and recall drills, and keep everything in one personal workspace. Free to start.",
  alternates: { canonical: "/" },
}

export default function Page() {
  return <HomeClient />
}
