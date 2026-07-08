export const FOLDER_COLORS: Record<string, string> = {
  projects: '#3C58D6',  // suit blue
  areas: '#F5C542',     // pad gold
  resources: '#EDF1FA', // armour white
  warroom: '#9AAFFF',   // war room blue
  archive: '#556080',   // muted blue-grey
  unsorted: '#8899AA',  // grey
};

export const FOLDER_GLOW: Record<string, string> = {
  projects: 'rgba(60,88,214,0.6)',
  areas: 'rgba(245,197,66,0.6)',
  resources: 'rgba(237,241,250,0.4)',
  warroom: 'rgba(154,175,255,0.6)',
  archive: 'rgba(85,96,128,0.4)',
  unsorted: 'rgba(136,153,170,0.4)',
};

export function getFolderColor(folder: string): string {
  return FOLDER_COLORS[folder] ?? FOLDER_COLORS['unsorted']!;
}

export function getFolderGlow(folder: string): string {
  return FOLDER_GLOW[folder] ?? FOLDER_GLOW['unsorted']!;
}
