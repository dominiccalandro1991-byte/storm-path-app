import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import { GALE_REROUTE, GALE_WEIGHTS } from "../../src/engines/constants";
import { bandLabel } from "../../src/engines/gale";
import { distSuffix, mToDist } from "../../src/engines/units";
import { planRoute } from "../../src/net";
import { useStorm } from "../../src/store";
import { C } from "../../src/theme";

export default function NavigateTab() {
  const dest = useStorm((s) => s.dest);
  const coord = useStorm((s) => s.coord);
  const plan = useStorm((s) => s.plan);
  const prefs = useStorm((s) => s.prefs);
  const patch = useStorm((s) => s.patch);
  const upsertRoute = useStorm((s) => s.upsertRoute);
  const setPrefs = useStorm((s) => s.setPrefs);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [nav, setNav] = useState(false);

  async function run() {
    if (!dest) {
      setErr("Pick a destination from Map search.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await planRoute(coord, dest, prefs.avoidHighways);
      patch({ plan: r });
      if (r.gale.reroute && prefs.haptics) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Cannot calculate route.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.pad}>
      <Text style={styles.kicker}>TRANSIT</Text>
      <Text style={styles.h}>Navigate</Text>
      <View style={styles.card}>
        <Text style={styles.body}>From current GPS fix</Text>
        <Text style={styles.body}>To {dest?.name ?? "— search on Map"}</Text>
        <Pressable onPress={() => setPrefs({ avoidHighways: !prefs.avoidHighways })} style={styles.row}>
          <Text style={styles.body}>{prefs.avoidHighways ? "☑" : "☐"} Avoid highways</Text>
        </Pressable>
        <Pressable onPress={() => setPrefs({ avoidTolls: !prefs.avoidTolls })} style={styles.row}>
          <Text style={styles.body}>{prefs.avoidTolls ? "☑" : "☐"} Avoid tolls (preference)</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => void run()}>
          <Text style={styles.btnTxt}>{busy ? "Computing" : "Gale route"}</Text>
        </Pressable>
        {plan && (
          <>
            <Pressable
              style={styles.btnQuiet}
              onPress={() => {
                const next = !nav;
                setNav(next);
                if (next && plan.steps[0] && prefs.voice) Speech.speak(plan.steps[0].instruction);
                else Speech.stop();
                if (prefs.haptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Text style={styles.btnQuietTxt}>{nav ? "Stop nav" : "Start nav"}</Text>
            </Pressable>
            <Pressable
              style={styles.btnQuiet}
              onPress={() => {
                if (!dest) return;
                upsertRoute({
                  id: `${Date.now()}`,
                  name: dest.name.split(",")[0] ?? "Route",
                  dest: dest.name,
                  distance_m: plan.distance_m,
                  duration_s: plan.duration_s,
                  gale_score: plan.gale.score,
                });
                if (prefs.haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Text style={styles.btnQuietTxt}>Save route</Text>
            </Pressable>
          </>
        )}
        {err && <Text style={styles.danger}>{err}</Text>}
      </View>
      {plan && (
        <View style={styles.card}>
          <Text style={styles.body}>
            {mToDist(plan.distance_m, prefs.distance).toFixed(1)} {distSuffix(prefs.distance)} ·{" "}
            {Math.round(plan.duration_s / 60)} min
          </Text>
          <Text style={plan.gale.reroute ? styles.danger : styles.primary}>
            {bandLabel(plan.gale.band)} · {(plan.gale.score * 100).toFixed(0)} · reroute ≥ {GALE_REROUTE}
          </Text>
          {plan.steps.slice(0, 40).map((s, i) => (
            <Text key={i} style={styles.step}>
              {s.instruction}
            </Text>
          ))}
        </View>
      )}
      <Text style={styles.mono}>
        precip {GALE_WEIGHTS.precip} · wind {GALE_WEIGHTS.wind} · vis {GALE_WEIGHTS.vis} · alert {GALE_WEIGHTS.alert}{" "}
        · radar {GALE_WEIGHTS.radar}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 12, paddingBottom: 48 },
  kicker: { color: C.muted, fontSize: 11, letterSpacing: 3 },
  h: { color: C.fg, fontSize: 28, fontWeight: "500" },
  card: { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  body: { color: C.fg, fontSize: 15, lineHeight: 22 },
  row: { minHeight: 44, justifyContent: "center" },
  btn: {
    backgroundColor: C.primary,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: "#041018", fontWeight: "600" },
  btnQuiet: {
    borderColor: C.border,
    borderWidth: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  btnQuietTxt: { color: C.primary },
  danger: { color: C.danger, fontSize: 13 },
  primary: { color: C.primary, fontSize: 14 },
  step: { color: C.fg, fontSize: 13, paddingVertical: 6, borderBottomColor: C.border, borderBottomWidth: StyleSheet.hairlineWidth },
  mono: { color: C.primary, fontSize: 12, fontVariant: ["tabular-nums"] },
});
