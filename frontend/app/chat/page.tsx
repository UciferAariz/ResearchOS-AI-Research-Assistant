"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Research Chat</h1>
        <p className="text-sm text-muted-foreground">
          Ask questions across every paper indexed so far. Answers cite the specific papers they draw
          from — search for a paper first if it hasn&apos;t come up.
        </p>
      </div>
      <ChatPanel placeholder="Ask about the papers you've searched…" />
    </main>
  );
}
