import { clampLat, clampLon, sampleLine } from "./engines/geo";
import { galeScore, fuseGale, type GaleReport } from "./engines/gale";
import { SAMPLE_MAX, SAMPLE_SPACING_M } from "./engines/constants";
import type { RoutePlan } from "./store";

const UA = "STORM-PATH-APP/1.0 (weather-aware navigation)";

async function getJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export type WxNow = {
  temp_c: number;
  precip_mm: number;
  wind_ms: number;
  vis_m: number;
  code: number;
  humidity: number;
  pressure_hpa: number;
  aqi: number | null;
};

export type AlertItem = { id: string; event: string; headline: string; severity: string };

export async function fetchNow(lat: number, lon: number): Promise<{
  now: WxNow;
  daily: { t: string; tmax: number; tmin: number; code: number; precip_prob: number }[];
  alerts: AlertItem[];
}> {
  const meteoUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,pressure_msl,visibility` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const aqiUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;
  const nwsUrl = `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`;
  const [m, a, n] = await Promise.allSettled([
    getJson(meteoUrl, 9000),
    getJson(aqiUrl, 6000),
    getJson(nwsUrl, 6000),
  ]);
  const raw = m.status === "fulfilled" ? (m.value as Record<string, unknown>) : {};
  const cur = (raw.current ?? {}) as Record<string, unknown>;
  const d = (raw.daily ?? {}) as Record<string, unknown>;
  const days = Array.isArray(d.time) ? (d.time as string[]) : [];
  let aqi: number | null = null;
  if (a.status === "fulfilled") {
    const acur = ((a.value as Record<string, unknown>).current ?? {}) as Record<string, unknown>;
    aqi = Number.isFinite(Number(acur.us_aqi)) ? Number(acur.us_aqi) : null;
  }
  const alerts: AlertItem[] = [];
  if (n.status === "fulfilled") {
    const feats = ((n.value as Record<string, unknown>).features ?? []) as Record<string, unknown>[];
    for (const f of feats.slice(0, 8)) {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      alerts.push({
        id: String(p.id ?? f.id ?? Math.random()),
        event: String(p.event ?? "Alert"),
        headline: String(p.headline ?? p.event ?? ""),
        severity: String(p.severity ?? ""),
      });
    }
  }
  return {
    now: {
      temp_c: Number(cur.temperature_2m) || 0,
      precip_mm: Number(cur.precipitation) || 0,
      wind_ms: (Number(cur.wind_speed_10m) || 0) / 3.6,
      vis_m: Number(cur.visibility) || 10000,
      code: Number(cur.weather_code) || 0,
      humidity: Number(cur.relative_humidity_2m) || 0,
      pressure_hpa: Number(cur.pressure_msl) || 1013,
      aqi,
    },
    daily: days.map((t, i) => ({
      t,
      tmax: Number((d.temperature_2m_max as number[])?.[i]) || 0,
      tmin: Number((d.temperature_2m_min as number[])?.[i]) || 0,
      code: Number((d.weather_code as number[])?.[i]) || 0,
      precip_prob: Number((d.precipitation_probability_max as number[])?.[i]) || 0,
    })),
    alerts,
  };
}

export async function geocode(q: string, lat: number, lon: number) {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}` +
    `&lat=${clampLat(lat)}&lon=${clampLon(lon)}`;
  const raw = (await getJson(url, 7000)) as Record<string, unknown>[];
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => ({
    name: String(r.display_name ?? query),
    lat: clampLat(Number(r.lat)),
    lon: clampLon(Number(r.lon)),
  }));
}

export async function planRoute(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  avoidHighways: boolean,
): Promise<RoutePlan> {
  const o = `${clampLon(from.lon)},${clampLat(from.lat)}`;
  const d = `${clampLon(to.lon)},${clampLat(to.lat)}`;
  const exclude = avoidHighways ? "&exclude=motorway" : "";
  const url =
    `https://router.project-osrm.org/route/v1/driving/${o};${d}` +
    `?overview=full&geometries=geojson&steps=true${exclude}`;
  const raw = (await getJson(url, 10000)) as Record<string, unknown>;
  const routes = (raw.routes ?? []) as Record<string, unknown>[];
  const r0 = routes[0];
  if (!r0) throw new Error("Route calculation failed");
  const geom = (r0.geometry ?? {}) as { coordinates?: [number, number][] };
  const geometry = Array.isArray(geom.coordinates) ? geom.coordinates : [];
  const steps: RoutePlan["steps"] = [];
  for (const leg of (r0.legs ?? []) as Record<string, unknown>[]) {
    for (const s of (leg.steps ?? []) as Record<string, unknown>[]) {
      const man = (s.maneuver ?? {}) as Record<string, unknown>;
      const type = String(man.type ?? "turn");
      const mod = man.modifier ? String(man.modifier) : "";
      const name = String(s.name ?? "");
      steps.push({
        instruction: [type, mod, name && `onto ${name}`].filter(Boolean).join(" "),
        distance_m: Number(s.distance) || 0,
        name,
      });
    }
  }
  const samples = sampleLine(geometry, SAMPLE_SPACING_M, SAMPLE_MAX);
  const reports: GaleReport[] = [];
  await Promise.all(
    samples.map(async (p) => {
      try {
        const j = (await getJson(
          `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=precipitation,wind_speed_10m,visibility,weather_code`,
          6000,
        )) as Record<string, unknown>;
        const cur = (j.current ?? {}) as Record<string, unknown>;
        const precip = Number(cur.precipitation) || 0;
        reports.push(
          galeScore({
            precip_mm_h: precip,
            wind_ms: (Number(cur.wind_speed_10m) || 0) / 3.6,
            vis_m: Number(cur.visibility) || 10000,
            radar_dbz: precip > 2 ? 40 : precip > 0.2 ? 22 : 0,
            severity: Number(cur.weather_code) >= 95 ? "Warning" : null,
          }),
        );
      } catch {
        /* skip */
      }
    }),
  );
  return {
    distance_m: Number(r0.distance) || 0,
    duration_s: Number(r0.duration) || 0,
    geometry,
    steps,
    gale: fuseGale(reports),
  };
}
