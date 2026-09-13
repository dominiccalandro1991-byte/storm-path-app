import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Root() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#071018" } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
