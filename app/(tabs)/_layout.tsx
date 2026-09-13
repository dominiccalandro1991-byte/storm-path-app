import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#121c28" },
        headerTintColor: "#e8f4f8",
        tabBarStyle: { backgroundColor: "#121c28", borderTopColor: "#243546", height: 64 },
        tabBarActiveTintColor: "#3dd6ff",
        tabBarInactiveTintColor: "#7f97a8",
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Map" }} />
      <Tabs.Screen name="weather" options={{ title: "Weather" }} />
      <Tabs.Screen name="navigate" options={{ title: "Navigate" }} />
      <Tabs.Screen name="saved" options={{ title: "Saved" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
