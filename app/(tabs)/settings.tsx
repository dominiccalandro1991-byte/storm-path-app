import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import * as Location from "expo-location";
import { useStorm } from "../../src/store";
import type { DistUnit, SpeedUnit, TempUnit } from "../../src/engines/units";
import { C } from "../../src/theme";

export default function SettingsTab() {
  const prefs = useStorm((s) => s.prefs);
  const setPrefs = useStorm((s) => s.setPrefs);
  const denied = useStorm((s) => s.denied);
  const acc = useStorm((s) => s.acc_m);
  const pressure = useStorm((s) => s.pressure_hpa);
  const places = useStorm((s) => s.places);
  const routes = useStorm((s) => s.routes);

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.pad}>
      <Text style={styles.kicker}>OPERATOR</Text>
      <Text style={styles.h}>Settings</Text>

      <Text style={styles.sub}>Units</Text>
      <Row label="Temperature">
        {(["F", "C", "K"] as TempUnit[]).map((u) => (
          <Chip key={u} on={prefs.temp === u} label={u} onPress={() => setPrefs({ temp: u })} />
        ))}
      </Row>
      <Row label="Distance">
        {(["mi", "km", "nm"] as DistUnit[]).map((u) => (
          <Chip key={u} on={prefs.distance === u} label={u} onPress={() => setPrefs({ distance: u })} />
        ))}
      </Row>
      <Row label="Speed">
        {(["mph", "kmh", "kt", "ms"] as SpeedUnit[]).map((u) => (
          <Chip key={u} on={prefs.speed === u} label={u} onPress={() => setPrefs({ speed: u })} />
        ))}
      </Row>

      <Text style={styles.sub}>Alerts & map</Text>
      <Toggle label="North up" on={prefs.northUp} onPress={() => setPrefs({ northUp: !prefs.northUp })} />
      <Toggle label="Navigation voice" on={prefs.voice} onPress={() => setPrefs({ voice: !prefs.voice })} />
      <Toggle label="Haptics" on={prefs.haptics} onPress={() => setPrefs({ haptics: !prefs.haptics })} />
      <Toggle
        label="Severe weather alerts"
        on={prefs.alertSevere}
        onPress={() => setPrefs({ alertSevere: !prefs.alertSevere })}
      />
      <Toggle label="Rain-start alerts" on={prefs.alertRain} onPress={() => setPrefs({ alertRain: !prefs.alertRain })} />

      <Text style={styles.sub}>Permissions</Text>
      <Text style={styles.body}>Location: {denied ? "denied" : "when-in-use"}</Text>
      <Text style={styles.muted}>CEP {acc != null ? `${acc.toFixed(0)} m` : "—"}</Text>
      <Text style={styles.muted}>Barometer {pressure != null ? `${pressure.toFixed(1)} hPa` : "waiting"}</Text>
      <Pressable
        style={styles.btn}
        onPress={() => {
          void Location.requestBackgroundPermissionsAsync();
        }}
      >
        <Text style={styles.btnTxt}>Request always-allow (geofence)</Text>
      </Pressable>

      <Text style={styles.sub}>Explorer</Text>
      <Text style={styles.mono}>PLACES {places.length}</Text>
      <Text style={styles.mono}>ROUTES {routes.length}</Text>

      <Text style={styles.muted}>
        Native-only: Always-Allow location, motion/barometer, push, StoreKit. Web sibling never takes IAP or
        Stripe. Two repositories — this is the app.
      </Text>
    </ScrollView>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: C.muted, fontSize: 12 }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: on ? C.primary : C.border,
        backgroundColor: C.surface,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: on ? C.primary : C.fg }}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ color: C.fg, fontSize: 15 }}>
        {on ? "☑" : "☐"} {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 20, gap: 12, paddingBottom: 48 },
  kicker: { color: C.muted, fontSize: 11, letterSpacing: 3 },
  h: { color: C.fg, fontSize: 28, fontWeight: "500" },
  sub: { color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: 8 },
  body: { color: C.fg, fontSize: 15 },
  muted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  mono: { color: C.primary, fontSize: 13, fontVariant: ["tabular-nums"] },
  btn: {
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnTxt: { color: C.primary, fontSize: 13 },
});
