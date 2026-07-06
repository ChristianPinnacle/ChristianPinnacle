"use client";

import { useState, useCallback } from "react";
import {
  Globe,
  MessageSquare,
  Smartphone,
  Briefcase,
  Sparkles,
  Loader2,
  ArrowRight,
  UserRound,
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
    id: "instagram_profile",
    label: "Instagram",
    icon: UserRound,
    placeholder: "coach_christianwilson  (just the handle — no @ or URL needed)",
    hint: "Pulls bio, followers, and recent posts automatically from Instagram",
  },
  {
    id: "url",
    label: "Website",
    icon: Globe,
    placeholder: "https://vitaledgehub.com.au",
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
  const canSubmit = input.trim().length > 0 && !isLoading;
  const isMultiline = type === "business" || type === "social";

  const submit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onAnalyze(trimmed, type);
    }
  }, [input, isLoading, onAnalyze, type]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !isMultiline)) {
      if (!isMultiline || e.metaKey || e.ctrlKey) {
        e.preventDefault();
        submit();
      }
    }
  }

  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {INPUT_TYPES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setType(id)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              type === id
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/10",
              id === "instagram_profile" && type !== id && "border-pink-500/30 text-pink-300/90"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {isMultiline ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected.placeholder}
            rows={5}
            className="w-full px-5 py-4 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none text-base leading-relaxed backdrop-blur-sm"
            disabled={isLoading}
          />
        ) : (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected.placeholder}
            className="w-full px-5 py-4 rounded-2xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-base leading-relaxed backdrop-blur-sm"
            disabled={isLoading}
            autoComplete="url"
          />
        )}

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {selected.hint}
            {isMultiline && " · Ctrl+Enter to analyze"}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all",
              canSubmit
                ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30 cursor-pointer"
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
        </div>
      </form>
    </div>
  );
}
