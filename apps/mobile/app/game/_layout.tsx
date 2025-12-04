import { Stack } from 'expo-router';

export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="description" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="current" />
    </Stack>
  );
}
