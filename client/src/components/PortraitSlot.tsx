import { useRef } from "react";
import { trpc } from "../lib/trpc";
import { notch } from "../theme";
import Frame from "./Frame";

type PortraitSlotProps = {
  portraitUrl: string | null;
};

export default function PortraitSlot({ portraitUrl }: PortraitSlotProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const utils = trpc.useUtils();
  const upload = trpc.portrait.upload.useMutation({
    onSuccess: () => {
      void utils.hud.get.invalidate();
    },
  });

  const handleFile = async (file: File | undefined): Promise<void> => {
    if (!file || !file.type.startsWith("image/")) return;

    const mimeType = file.type as "image/png" | "image/jpeg" | "image/webp";
    if (!["image/png", "image/jpeg", "image/webp"].includes(mimeType)) return;

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    const dataBase64 = btoa(binary);

    upload.mutate({ dataBase64, mimeType });
  };

  return (
    <Frame pad={0} accent="#F5C542">
      <button
        type="button"
        className="portrait-slot"
        onClick={() => inputRef.current?.click()}
        aria-label="Upload portrait"
        style={{ clipPath: notch(12) }}
      >
        {portraitUrl ? (
          <img src={portraitUrl} alt="Your portrait" className="portrait-image" />
        ) : (
          <svg viewBox="0 0 300 190" className="portrait-placeholder" aria-hidden="true">
            {Array.from({ length: 14 }).map((_, i) => {
              const x = 150 + (i - 7) * 16;
              const h = 60 + Math.abs(7 - i) * -4 + (i % 3) * 26;
              return (
                <path
                  key={i}
                  d={`M${x} 185 L${x - 9} ${185 - h} L${x} ${170 - h - (i % 2) * 18} L${x + 9} ${185 - h} Z`}
                  fill={i % 2 ? "#2E5BFF" : "#5FD4FF"}
                  opacity={0.16 + (i % 3) * 0.1}
                />
              );
            })}
            <ellipse cx="150" cy="188" rx="120" ry="16" fill="#5FD4FF22" />
            <circle cx="150" cy="120" r="34" fill="none" stroke="#5FD4FF66" strokeWidth="1.4" strokeDasharray="6 8" />
            <text x="150" y="118" textAnchor="middle" fill="#7FA8FF" fontSize="10" letterSpacing="2">
              YOUR ART
            </text>
            <text x="150" y="132" textAnchor="middle" fill="#4A5B8F" fontSize="8" letterSpacing="2">
              TAP TO UPLOAD
            </text>
          </svg>
        )}
        <div className="portrait-overlay" />
        {upload.isPending && <div className="portrait-uploading">UPLOADING...</div>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </Frame>
  );
}
