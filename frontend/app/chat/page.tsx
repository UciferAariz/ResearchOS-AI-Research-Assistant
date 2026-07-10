"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/60 px-10 py-[18px]">
        <div className="flex size-[30px] flex-none items-center justify-center rounded-[9px] bg-gradient-to-br from-brand to-brand-secondary">
          <div className="size-[11px] rounded-[3px] border-2 border-background" />
        </div>
        <div>
          <div className="font-serif text-base font-medium">Ask your research assistant</div>
          <div className="text-[11.5px] text-muted-foreground">Answers cite the papers they draw from</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full border border-brand-secondary/30 px-[11px] py-[5px] font-mono text-[10.5px] text-brand-secondary">
          <span className="size-1.5 rounded-full bg-brand-secondary" />
          Agent online
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-[780px]">
          <ChatPanel placeholder="Ask a follow-up, or paste a DOI to add it to context…" />
        </div>
      </div>
    </div>
  );
}
