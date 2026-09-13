import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { distSuffix, mToDist } from "../../src/engines/units";
import { useStorm } from "../../src/store";
import { C } from "../../src/theme";

const KINDS = ["crash", "speed-trap", "hazard", "severe-weather"] as const;

export default function SavedTab() {
  const places = useStorm((s) => s.places);
  const routes = useStorm((s) => s.routes);
  const prefs = useStorm((s) => s.prefs);
  const coord = useStorm((s) => s.coord);
  const upsertPlace = useStorm((s) => s.upsertPlace);
  const removePlace = useStorm((s) => s.removePlace);
  const patch = useStorm((s) => s.patch);

  function pin(kind: "home" | "work" | "saved") {
    if (prefs.haptics) void Haptics.selectionAsync();
    upsertPlace({
      id: kind === "saved" ? `${Date.now()}` : kind,
      name: kind === "home" ? "Home" : kind === "work" ? "Work" : "Dropped pin",
      lat: coord.lat,
      lon: coord.lon,
      kind,
    });
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.pad}>
      <Text style={styles.kicker}>ATLAS</Text>
      <Text style={styles.h}>Saved</Text>
      <View style={styles.row}>
        <Pressable style={styles.chip} onPress={() => pin("home")}>
          <Text style={styles.chipTxt}>Set Home</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => pin("work")}>
          <Text style={styles.chipTxt}>Set Work</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => pin("saved")}>
          <Text style={styles.chipTxt}>Save pin</Text>
        </Pressable>
      </View>
      {places.length === 0 && <Text style={styles.muted}>No places yet.</Text>}
      {places.map((p) => (
        <View key={p.id} style={styles.card}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => patch({ dest: { name: p.name, lat: p.lat, lon: p.lon }, coord: { lat: p.lat, lon: p.lon } })}
          >
            <Text style={styles.body}>{p.name}</Text>
            <Text style={styles.muted}>{p.kind}</Text>
          </Pressable>
          <Pressable onPress={() => removePlace(p.id)}>
            <Text style={styles.danger}>Remove</Text>
          </Pressable>
        </View>
      ))}
      <Text style={styles.sub}>Routes</Text>
      {routes.length === 0 && <Text style={styles.muted}>No saved routes.</Text>}
      {routes.map((r) => (
        <View key={r.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.body}>{r.name}</Text>
            <Text style={styles.muted}>
              {mToDist(r.distance_m, prefs.distance).toFixed(1)} {distSuffix(prefs.distance)} · Gale{" "}
              {(r.gale_score * 100).toFixed(0)}
            </Text>
          </View>
        </View>
      ))}
      <Text style={styles.sub}>Report</Text>
      <View style={styles.row}>
        {KINDS.map((k) => (
          <Pressable
            key={k}
            style={styles.chip}
            onPress={() => {
              Alert.alert("Report queued", `${k} at ${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}`);
              if (prefs.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          >
            <Text style={styles.chipTxt}>{k.replace("-", " ")}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 10, paddingBottom: 48 },
  kicker: { color: C.muted, fontSize: 11, letterSpacing: 3 },
  h: { color: C.fg, fontSize: 28, fontWeight: "500" },
  sub: { color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: C.surface,
  },
  chipTxt: { color: C.primary, fontSize: 12 },
  card: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  body: { color: C.fg, fontSize: 15 },
  muted: { color: C.muted, fontSize: 12 },
  danger: { color: C.danger, fontSize: 13 },
});
