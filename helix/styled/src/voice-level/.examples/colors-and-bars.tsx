import './colors-and-bars.css'

export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="xl"
      wrap
    >
      <helix-voice-level
        bands="0.4 0.7 0.9 0.8 0.7 0.6 0.5 0.45 0.35 0.3 0.2 0.1"
        className="fewer-bars"
      ></helix-voice-level>
      <helix-voice-level
        className="two-colors"
        level={0.7}
        variant="waves"
      ></helix-voice-level>
    </helix-flex>
  )
}
