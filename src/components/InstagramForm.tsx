"use client";

import { useState } from "react";
import { ArrowRight, Loader2, UserRound, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstagramFormProps {
  onAnalyze: (input: string) => void;
  isLoading: boolean;
}

export function InstagramForm({ onAnalyze, isLoading }: InstagramFormProps) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [followers, setFollowers] = useState("");
  const [linkInBio, setLinkInBio] = useState("");

  const canSubmit = username.trim().length > 0 && bio.trim().length > 0 && !isLoading;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const handle = username.trim().replace(/^@/, "").replace(/.*instagram\.com\//, "").split("/")[0];
    const url = `instagram.com/${handle}`;

    // Build structured input the analyzer understands
    const lines = [url, bio.trim()];
    if (followers.trim()) lines.push(`followers: ${followers.trim()}`);
    if (linkInBio.trim()) lines.push(`link: ${linkInBio.trim()}`);

    onAnalyze(lines.join("\n"));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* How-to banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Open Instagram → your profile → <strong>Edit profile</strong> → copy your bio text and paste it below.
        </span>
      </div>

      {/* Username */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Instagram handle <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base select-none">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
            placeholder="coach_christianwilson"
            className="w-full pl-8 pr-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-base backdrop-blur-sm"
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Your bio <span className="text-red-400">*</span>
          <span className="ml-2 font-normal text-slate-500">— copy exactly from Instagram → Edit profile → Bio</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={"e.g. I help busy adults lose fat & build muscle 🏋️\nCustom programs · Macro coaching\n👇 DM COACH for my free guide"}
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none text-base leading-relaxed backdrop-blur-sm"
          disabled={isLoading}
        />
        <p className={cn("text-xs mt-1 text-right", bio.length > 150 ? "text-amber-400" : "text-slate-600")}>
          {bio.length}/150 chars
        </p>
      </div>

      {/* Optional fields row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Followers <span className="text-slate-600 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={followers}
            onChange={(e) => setFollowers(e.target.value)}
            placeholder="e.g. 3.2K or 3200"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm backdrop-blur-sm"
            disabled={isLoading}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Link in bio <span className="text-slate-600 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={linkInBio}
            onChange={(e) => setLinkInBio(e.target.value)}
            placeholder="e.g. linktr.ee/yourname"
            className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-sm backdrop-blur-sm"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <p className="text-xs text-slate-500">
          Fields marked <span className="text-red-400">*</span> are required
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
              <UserRound className="w-4 h-4" />
              Analyze Profile
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
