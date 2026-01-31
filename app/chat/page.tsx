"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Terminal, Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
        { role: "ai", text: "> SYSTEM INITIALIZED" },
        { role: "ai", text: "> CFO-AI v2.3.1 READY" },
        { role: "ai", text: "> I can help you with GST compliance, tax calculations, ITC claims, and financial analysis." },
        { role: "ai", text: "> What would you like to know?" },
    ]);

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;

        const userMessage = message;
        setMessage("");

        setMessages((prev) => [
            ...prev,
            { role: "user", text: userMessage },
        ]);

        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await res.json();

            if (data.reply) {
                setMessages((prev) => [
                    ...prev,
                    { role: "ai", text: data.reply },
                ]);
            } else {
                throw new Error(data.error || "Failed to get response");
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { role: "ai", text: "> ERROR: CONNECTION FAILURE. RETRYING..." },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="flex flex-col h-[calc(100vh-100px)] max-w-5xl mx-auto">
                {/* Page Title */}
                <div className="mb-6">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                        // AI CFO ASSISTANT
                    </div>
                    <h1 className="mt-1 font-mono text-3xl font-bold tracking-tight uppercase">
                        FINANCIAL INTELLIGENCE TERMINAL
                    </h1>
                    <p className="mt-1 font-mono text-xs text-muted-foreground uppercase">
                        NATURAL LANGUAGE GST QUERIES & COMPLIANCE INSIGHTS
                    </p>
                </div>

                {/* Terminal Window */}
                <div className="flex-1 border-2 border-black flex flex-col bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">

                    {/* Terminal Header */}
                    <div className="bg-black text-white p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 font-mono text-xs">
                            <span>{">_"}</span>
                            <span>CFO_TERMINAL</span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-sm animate-pulse" />
                                <span className="text-green-500">ONLINE</span>
                            </span>
                        </div>
                        <div className="font-mono text-[10px] text-zinc-400">
                            CLAUDE 3.5 SONNET POWERED
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-6 overflow-y-auto font-mono text-sm space-y-4">
                        {messages.map((msg, i) => (
                            <div key={i} className={cn(
                                "leading-relaxed break-words max-w-4xl",
                                msg.role === "user" ? "text-green-600 font-bold" : "text-zinc-600"
                            )}>
                                <span className="mr-3 select-none opacity-50 font-bold">
                                    {msg.role === "user" ? "$" : ">"}
                                </span>
                                {msg.text}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-center gap-2 text-zinc-400">
                                <span className="mr-3 select-none opacity-50">{">"}</span>
                                <span className="animate-pulse">THINKING...</span>
                            </div>
                        )}

                        {/* Cursor for empty state */}
                        {!isLoading && messages.length > 0 && (
                            <div className="flex items-center gap-2 text-green-500 animate-pulse mt-2">
                                <span className="mr-3 select-none font-bold opacity-100">{">"}</span>
                                <span className="w-2 h-4 bg-green-500" />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-4 border-t-2 border-black bg-zinc-50">
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-green-600 font-bold text-lg">$</span>
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                autoFocus
                                placeholder="Ask about your taxes, compliance, or finances..."
                                className="flex-1 bg-transparent font-mono text-sm outline-none placeholder:text-zinc-400 text-black"
                            />
                            <button
                                onClick={handleSend}
                                className="p-2 border border-black hover:bg-black hover:text-white transition-colors"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Capabilities Footer */}
                <div className="mt-8 mb-4">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                        // AI CAPABILITIES
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10px] text-zinc-500 uppercase">
                        <span className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-zinc-400 rounded-full" />
                            GST RETURN FILING GUIDANCE
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-zinc-400 rounded-full" />
                            ITC RECONCILIATION
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-zinc-400 rounded-full" />
                            VENDOR RISK ANALYSIS
                        </span>
                        <span className="flex items-center gap-2">
                            <span className="w-1 h-1 bg-zinc-400 rounded-full" />
                            TAX COMPUTATION
                        </span>
                    </div>
                </div>

                {/* Floating Action Button (Decorative for now, could scroll to bottom) */}
                <div className="fixed bottom-8 right-8">
                    <button className="w-12 h-12 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:translate-y-1 hover:shadow-none transition-all">
                        <span className="font-mono font-bold text-lg">{">_"}</span>
                    </button>
                </div>
            </div>
        </DashboardLayout>
    );
}
