/* The screens on a phone: a stack, with the router's own header hidden,
   since the root layout draws App Header over every screen. A project slides
   in over the list and slides back with the system's back. The destinations
   in the header take each other's place with no slide. */
import { useTokens } from '@fusion.dev/helix-native'
import { Stack } from 'expo-router'

export function Navigator() {
  const tokens = useTokens()
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: String(tokens['color-background'] ?? '') },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="projects/index" options={{ animation: 'none' }} />
    </Stack>
  )
}
