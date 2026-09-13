import { create } from "zustand";
import { ORIGIN } from "./engines/constants";
import { DEFAULT_UNITS, type UnitPrefs } from "./engines/units";
import type { GaleReport } from "./engines/gale";

export type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: "home" | "work" | "saved" | "recent";
};

export type SavedRoute = {
  id: string;
  name: string;
  dest: string;
  distance_m: number;
  duration_s: number;
  gale_score: number;
};

export type RoutePlan = {
  distance_m: number;
  duration_s: number;
  geometry: [number, number][];
  steps: { instruction: string; distance_m: number; name: string }[];
  gale: GaleReport;
};

export type Prefs = UnitPrefs & {
  northUp: boolean;
  voice: boolean;
  haptics: boolean;
  avoidHighways: boolean;
  avoidTolls: boolean;
  alertSevere: boolean;
  alertRain: boolean;
};

type StormState = {
  prefs: Prefs;
  coord: { lat: number; lon: number };
  dest: { name: string; lat: number; lon: number } | null;
  plan: RoutePlan | null;
  places: Place[];
  routes: SavedRoute[];
  denied: boolean;
  heading: number | null;
  speed_ms: number | null;
  alt_m: number | null;
  acc_m: number | null;
  pressure_hpa: number | null;
  patch: (p: Partial<StormState>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  upsertPlace: (p: Place) => void;
  removePlace: (id: string) => void;
  upsertRoute: (r: SavedRoute) => void;
};

export const useStorm = create<StormState>((set, get) => ({
  prefs: {
    ...DEFAULT_UNITS,
    northUp: false,
    voice: true,
    haptics: true,
    avoidHighways: false,
    avoidTolls: false,
    alertSevere: true,
    alertRain: true,
  },
  coord: { lat: ORIGIN.lat, lon: ORIGIN.lon },
  dest: null,
  plan: null,
  places: [],
  routes: [],
  denied: false,
  heading: null,
  speed_ms: null,
  alt_m: null,
  acc_m: null,
  pressure_hpa: null,
  patch: (p) => set(p),
  setPrefs: (p) => set({ prefs: { ...get().prefs, ...p } }),
  upsertPlace: (place) =>
    set({
      places: [place, ...get().places.filter((x) => x.id !== place.id)].slice(0, 40),
    }),
  removePlace: (id) => set({ places: get().places.filter((p) => p.id !== id) }),
  upsertRoute: (r) =>
    set({ routes: [r, ...get().routes.filter((x) => x.id !== r.id)].slice(0, 40) }),
}));
