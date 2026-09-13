import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { galeScore } from "../../src/engines/gale";
import { wmoLabel } from "../../src/engines/wmo";
import { cToTemp, tempSuffix } from "../../src/engines/units";
import { fetchNow, type AlertItem } from "../../src/net";
import { useStorm } from "../../src/store";
import { C } from "../../src/theme";

export default function WeatherTab() {
  const coord = useStorm((s) => s.coord);
  const prefs = useStorm((s) => s.prefs);
  const [lines, setLines] = useState<string[]>(["Hydrating meteorological models…"]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [gale, setGale] = useState("");
  const [hot, setHot] = useState(false);

  useEffect(() => {
    void fetchNow(coord.lat, coord.lon)
      .then((w) => {
        const g = galeScore({
          precip_mm_h: w.now.precip_mm,
          wind_ms: w.now.wind_ms,
          vis_m: w.now.vis_m,
          radar_dbz: w.now.precip_mm > 2 ? 40 : 0,
          severity: w.alerts[0]?.severity ?? null,
        });
        setGale(`Gale ${(g.score * 100).toFixed(0)} · ${g.band}`);
        setHot(g.reroute);
        setAlerts(w.alerts);
        setLines([
          `Now ${cToTemp(w.now.temp_c, prefs.temp).toFixed(0)}${tempSuffix(prefs.temp)} · ${wmoLabel(w.now.code).label}`,
          `RH ${w.now.humidity.toFixed(0)}% · ${w.now.pressure_hpa.toFixed(0)} hPa`,
          `AQI ${w.now.aqi ?? "—"} · vis ${(w.now.vis_m / 1000).toFixed(1)} km`,
          "",
          ...w.daily.map(
            (d) =>
              `${d.t}  ${wmoLabel(d.code).label}  ${cToTemp(d.tmin, prefs.temp).toFixed(0)}–${cToTemp(d.tmax, prefs.temp).toFixed(0)}${tempSuffix(prefs.temp)}  ${d.precip_prob.toFixed(0)}%`,
          ),
        ]);
      })
      .catch(() => setLines(["Weather ingest failed. Check network."]));
  }, [coord.lat, coord.lon, prefs.temp]);

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.pad}>
      <Text style={styles.kicker}>ATMOSPHERE</Text>
      <Text style={styles.h}>Weather</Text>
      <View style={styles.card}>
        <Text style={[styles.body, hot && styles.danger]}>{gale}</Text>
        <Text style={styles.body}>{lines.join("\n")}</Text>
      </View>
      {alerts.map((a) => (
        <View key={a.id} style={styles.alert}>
          <Text style={styles.alertTitle}>{a.event}</Text>
          <Text style={styles.muted}>{a.headline}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 12, paddingBottom: 40 },
  kicker: { color: C.muted, fontSize: 11, letterSpacing: 3 },
  h: { color: C.fg, fontSize: 28, fontWeight: "500" },
  card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16 },
  body: { color: C.fg, fontSize: 14, lineHeight: 22, fontVariant: ["tabular-nums"] },
  danger: { color: C.danger },
  alert: {
    backgroundColor: "rgba(255,77,77,0.12)",
    borderColor: C.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  alertTitle: { color: C.fg, fontSize: 15, fontWeight: "600" },
  muted: { color: C.muted, fontSize: 12, marginTop: 4 },
});
