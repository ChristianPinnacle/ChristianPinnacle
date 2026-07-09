export const NAVY = "#05070F";
export const CARD = "#0A0D1C";
export const GOLD = "#F5C542";
export const GOLDD = "#8A6A1D";
export const RED = "#FF3B45";
export const MUTE = "#6B7694";
export const WHITE = "#EDF1FA";

export const FOLDER_COLORS: Record<string, string> = {
  projects: "#4D6BFF",
  areas: GOLD,
  resources: WHITE,
  warroom: "#9AAFFF",
  archive: "#5A6890",
  unsorted: RED,
};

export const FOLDER_LABELS: Record<string, string> = {
  projects: "ELITE",
  areas: "ROYAL",
  resources: "CAPSULE",
  warroom: "WAR ROOM",
  archive: "GRAVEYARD",
  unsorted: "SCOUTER ERROR",
};

export function notch(n = 10): string {
  return `polygon(${n}px 0, calc(100% - ${n}px) 0, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, 0 calc(100% - ${n}px), 0 ${n}px)`;
}
