"use client";

import { useState } from "react";
import {
  Globe,
  MessageSquare,
  Smartphone,
  Briefcase,
  Sparkles,
  Loader2,
  ArrowRight,
} from "lucide-react";
import type { InputType } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT_TYPES: { id: InputType; label: string; icon: typeof Globe; placeholder: string; hint: string }[] = [
  {
    id: "auto",
    label: "Auto-detect",
    icon: Sparkles,
    placeholder: "Paste a URL, social post, app link, or business description…",
    hint: "We'll automatically detect what you're analyzing",
  },
  {
    id: "url",
    label: "Website",
    icon: Globe,
    placeholder: "https://example.com",
    hint: "Analyze SEO, content, technical health, and marketing signals",
  },
  {
    id: "social",
    label: "Social Post",
    icon: MessageSquare,
    placeholder: "Paste your post copy or social media URL…",
    hint: "Get engagement, hashtag, and platform-specific tips",
  },
  {
    id: "app",
    label: "Mobile App",
    icon: Smartphone,
    placeholder: "https://apps.apple.com/app/… or Google Play URL",
    hint: "ASO analysis, listing quality, and growth recommendations",
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    placeholder: "Paste your pitch, about page, product description…",
    hint: "Value proposition, audience fit, and messaging analysis",
  },
];

interface InputPanelProps {
  onAnalyze: (input: string, type: InputType) => void;
  isLoading: boolean;
}

export function InputPanel({ onAnalyze, isLoading }: InputPanelProps) {
  const [input, setInput] = useState("");
  const [type, setType] = useState<InputType>("auto");

  const selected = INPUT_TYPES.find((t) => t.id === type) ?? INPUT_TYPES[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onAnalyze(input.trim(), type);
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 mb-4">
        {INPUT_TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setType(id)}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              type === id
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/10"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selected.placeholder}
          rows={type === "business" || type === "social" ? 5 : 3}
          className="w-full px-5 py-4 pr-36 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none text-base leading-relaxed backdrop-blur-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={cn(
            "absolute right-3 bottom-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
            input.trim() && !isLoading
              ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30"
              : "bg-slate-700 text-slate-500 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </>
          ) : (
            <>
              Analyze
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-3 text-sm text-slate-500">{selected.hint}</p>
    </div>
  );
}
