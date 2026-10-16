export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="xl"
      wrap
    >
      <helix-voice-level
        bands="0.35 0.5 0.7 0.85 0.9 0.8 0.75 0.7 0.72 0.65 0.6 0.55 0.6 0.5 0.45 0.4 0.42 0.35 0.3 0.28 0.22 0.18 0.12 0.08"
        label="Your voice"
        still
      ></helix-voice-level>
      <helix-voice-level
        label="Your voice"
        level={0.6}
        still
        variant="waves"
      ></helix-voice-level>
    </helix-flex>
  )
}
