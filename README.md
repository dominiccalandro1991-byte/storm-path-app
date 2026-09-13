# STORM PATH — app

Native **iOS / Android** client (Expo). This repository is **not** the website. The website is [storm-path-web](https://github.com/dominiccalandro1991-byte/storm-path-web). Do not merge them.

## 1.0 Run

```text
npm install
npx expo start
```

Open in Expo Go, or `npx expo run:ios` / `run:android` for a dev client.

## 1.1 Same engine

`src/engines/gale.ts` is the Gale Vector Engine copied from the web repo. Weights and reroute threshold (0.72) must stay identical. Weather is Open-Meteo + NWS. Routing is public OSRM. Map is `react-native-maps` (MapKit / Google). RainViewer radar tiles that need MapLibre GL stay on the web until a custom dev client ships MapLibre Native.

## 1.2 Permissions

- Location when in use (HUD, recenter, route origin)
- Always-allow is requested only for severe-weather geofences (optional)
- Barometer (when the hardware exists)
- Speech for turn prompts
- Haptics on tab actions and Gale reroute

## 1.3 Inspection directive

1. App repo only — no TanStack / Vercel / Neon schema here.
2. No Stripe, no heal, no CRM, no social feed.
3. Do not fold this tree into `storm-path-web`.

See [GPS_COVERAGE.md](./GPS_COVERAGE.md).
