import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Barometer } from "expo-sensors";
import { galeScore } from "../../src/engines/gale";
import { wmoLabel } from "../../src/engines/wmo";
import { fetchNow, geocode } from "../../src/net";
import { useStorm } from "../../src/store";
import { C } from "../../src/theme";

export default function MapTab() {
  const coord = useStorm((s) => s.coord);
  const dest = useStorm((s) => s.dest);
  const plan = useStorm((s) => s.plan);
  const denied = useStorm((s) => s.denied);
  const patch = useStorm((s) => s.patch);
  const upsertPlace = useStorm((s) => s.upsertPlace);
  const prefs = useStorm((s) => s.prefs);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [sky, setSky] = useState<string | null>(null);
  const [galeTxt, setGaleTxt] = useState<string | null>(null);
  const [galeHot, setGaleHot] = useState(false);
  const [mapType, setMapType] = useState<"standard" | "satellite" | "hybrid" | "terrain">("standard");

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        patch({ denied: true });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      patch({
        denied: false,
        coord: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        heading: pos.coords.heading,
        speed_ms: pos.coords.speed,
        alt_m: pos.coords.altitude,
        acc_m: pos.coords.accuracy,
      });
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 8 },
        (p) => {
          patch({
            coord: { lat: p.coords.latitude, lon: p.coords.longitude },
            heading: p.coords.heading,
            speed_ms: p.coords.speed,
            alt_m: p.coords.altitude,
            acc_m: p.coords.accuracy,
          });
        },
      );
      return () => sub.remove();
    })();
  }, [patch]);

  useEffect(() => {
    const avail = Barometer.isAvailableAsync();
    void avail.then((ok) => {
      if (!ok) return;
      const sub = Barometer.addListener((m) => {
        if (m.pressure) patch({ pressure_hpa: m.pressure });
      });
      Barometer.setUpdateInterval(2000);
      return () => sub.remove();
    });
  }, [patch]);

  useEffect(() => {
    void fetchNow(coord.lat, coord.lon)
      .then((w) => {
        setSky(`${wmoLabel(w.now.code).label} · ${w.now.temp_c.toFixed(0)}°C`);
        const g = galeScore({
          precip_mm_h: w.now.precip_mm,
          wind_ms: w.now.wind_ms,
          vis_m: w.now.vis_m,
          radar_dbz: w.now.precip_mm > 2 ? 40 : 0,
          severity: w.alerts[0]?.severity ?? null,
        });
        setGaleTxt(`Gale ${(g.score * 100).toFixed(0)} · ${g.band}`);
        setGaleHot(g.reroute);
        if (prefs.haptics && g.reroute) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      })
      .catch(() => undefined);
  }, [coord.lat, coord.lon, prefs.haptics]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      void geocode(q, coord.lat, coord.lon)
        .then(setHits)
        .catch(() => setHits([]));
    }, 320);
    return () => clearTimeout(t);
  }, [q, coord.lat, coord.lon]);

  return (
    <View style={styles.fill}>
      <MapView
        style={styles.fill}
        mapType={mapType}
        showsUserLocation
        showsCompass
        showsScale
        region={{
          latitude: coord.lat,
          longitude: coord.lon,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        }}
      >
        <Marker coordinate={{ latitude: coord.lat, longitude: coord.lon }} title="Fix" pinColor="#3dd6ff" />
        {dest && (
          <Marker
            coordinate={{ latitude: dest.lat, longitude: dest.lon }}
            title={dest.name}
            pinColor="#ffb020"
          />
        )}
        {plan && plan.geometry.length > 1 && (
          <Polyline
            coordinates={plan.geometry.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))}
            strokeColor="#3dd6ff"
            strokeWidth={5}
          />
        )}
      </MapView>
      <View style={styles.search}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search for places, weather, or routes"
          placeholderTextColor={C.muted}
          style={styles.input}
        />
        {hits.slice(0, 5).map((h) => (
          <Pressable
            key={`${h.lat}-${h.lon}`}
            style={styles.hit}
            onPress={() => {
              if (prefs.haptics) void Haptics.selectionAsync();
              patch({ dest: h, coord: { lat: h.lat, lon: h.lon } });
              upsertPlace({
                id: `${h.lat.toFixed(4)},${h.lon.toFixed(4)}`,
                name: h.name,
                lat: h.lat,
                lon: h.lon,
                kind: "recent",
              });
              setHits([]);
              setQ(h.name.split(",")[0] ?? h.name);
            }}
          >
            <Text style={styles.hitTxt} numberOfLines={1}>
              {h.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.kicker}>STORM PATH</Text>
        {denied && <Text style={styles.warn}>Manual mode — location denied</Text>}
        {sky && <Text style={styles.line}>{sky}</Text>}
        {galeTxt && <Text style={[styles.line, galeHot ? styles.danger : styles.primary]}>{galeTxt}</Text>}
      </View>
      <View style={styles.fabs}>
        {(["standard", "satellite", "hybrid", "terrain"] as const).map((t) => (
          <Pressable key={t} style={styles.chip} onPress={() => setMapType(t)}>
            <Text style={[styles.chipTxt, mapType === t && styles.primary]}>{t}</Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.fab}
          onPress={() => {
            if (prefs.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void Location.getCurrentPositionAsync({}).then((p) =>
              patch({ coord: { lat: p.coords.latitude, lon: p.coords.longitude } }),
            );
          }}
        >
          <Text style={styles.fabTxt}>RECENTER</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  search: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: "rgba(18,28,40,0.95)",
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  input: { color: C.fg, minHeight: 44, paddingHorizontal: 14, fontSize: 14 },
  hit: { paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.border },
  hitTxt: { color: C.fg, fontSize: 12 },
  hud: {
    position: "absolute",
    top: 64,
    left: 12,
    backgroundColor: "rgba(18,28,40,0.92)",
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    maxWidth: 220,
  },
  kicker: { color: C.muted, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  line: { color: C.fg, fontSize: 14, marginTop: 2 },
  primary: { color: C.primary },
  danger: { color: C.danger },
  warn: { color: C.warn, fontSize: 12 },
  fabs: { position: "absolute", right: 12, bottom: 24, alignItems: "flex-end", gap: 8 },
  fab: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  fabTxt: { color: C.primary, fontSize: 11, letterSpacing: 1 },
  chip: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 36,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  chipTxt: { color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 },
});
