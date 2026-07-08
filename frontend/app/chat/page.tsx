"use client";

import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center">
      <div className="bg-hero-glow absolute inset-x-0 top-0 h-[24rem] w-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand">
            <MessageSquare className="size-3.5" />
            Research Chat
          </span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Chat with your <span className="text-gradient-brand">indexed papers</span>
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Ask questions across every paper indexed so far. Answers cite the specific papers they
            draw from — search for a paper first if it hasn&apos;t come up.
          </p>
        </motion.div>
        <ChatPanel placeholder="Ask about the papers you've searched…" />
      </div>
    </main>
  );
}
