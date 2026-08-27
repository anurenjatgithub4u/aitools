"use client"

import { useAuth } from "@/components/auth-context"
import { LibraryView } from "@/components/workspace/library-view"
import { ImportConversationButton } from "@/components/workspace/import-conversation"

export default function AiMemoryPage() {
  const { user } = useAuth()
  return (
    <LibraryView
      type="knowledge"
      title="AI Memory"
      description="Everything you've learned with AI — conversations, answers and insights, searchable forever."
      headerExtra={user ? <ImportConversationButton userId={user.uid} /> : undefined}
      emptyExtra={user ? <ImportConversationButton userId={user.uid} /> : undefined}
    />
  )
}
