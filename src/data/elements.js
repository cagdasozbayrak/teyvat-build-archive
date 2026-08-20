export const ELEMENTS = {
  Anemo: { color: "#6fd6b4", soft: "rgba(111,214,180,0.16)" },
  Geo: { color: "#f0b03a", soft: "rgba(240,176,58,0.16)" },
  Electro: { color: "#bd84e6", soft: "rgba(189,132,230,0.16)" },
  Dendro: { color: "#a3cc4a", soft: "rgba(163,204,74,0.16)" },
  Hydro: { color: "#3fb0e8", soft: "rgba(63,176,232,0.16)" },
  Pyro: { color: "#ff6d49", soft: "rgba(255,109,73,0.16)" },
  Cryo: { color: "#8ed6ef", soft: "rgba(142,214,239,0.16)" },
};
export const ELEMENT_LIST = Object.keys(ELEMENTS);

export const WEAPON_PATHS = {
  Sword: "M4 20l4-4M8 16l9-9 3-3-1 4-9 9M8 16l1 1",
  Claymore: "M5 19l5-5M10 14l8-8 1-4-4 1-8 8 1 1 2 2M5 19l2-2",
  Polearm: "M5 19L17 7M17 7l2-4-4 2M17 7l-1-1",
  Bow: "M6 4c6 3 6 13 0 16M6 4l12 8-12 8M6 4v16",
  Catalyst: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M7 12h10",
};
export const WEAPON_LIST = Object.keys(WEAPON_PATHS);
