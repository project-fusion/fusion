import { useEffect, useState } from 'react'

/* Made-up readings with the shape of speech: syllables about five times a
   second for two seconds, then a second of silence. Real readings come from
   your audio, such as an `AnalyserNode`'s frequency data grouped into bands. */
const BANDS = 24
const reading = (time: number): { bands: number[]; level: number } => {
  const at = time % 3
  const syllable = at < 2 ? Math.max(0, Math.sin(at * Math.PI * 5)) ** 0.6 : 0
  const level = syllable * (0.55 + 0.25 * Math.sin(time * 1.7))
  const peak = 6 + 3 * Math.sin(time * 2.3)
  const bands = Array.from({ length: BANDS }, (_, band) =>
    Math.min(1, level * Math.exp(-(((band - peak) / 7) ** 2)) * 1.3),
  )
  return { bands, level }
}

export function Example() {
  const [now, setNow] = useState(() => reading(0))

  useEffect(() => {
    const started = performance.now()
    const timer = setInterval(() => {
      setNow(reading((performance.now() - started) / 1000))
    }, 1000 / 30)
    return () => clearInterval(timer)
  }, [])

  return (
    <helix-flex
      align-items="center"
      gap="xl"
      wrap
    >
      <helix-voice-level
        bands={now.bands}
        label="Your voice"
      ></helix-voice-level>
      <helix-voice-level
        label="Your voice"
        level={now.level}
        variant="waves"
      ></helix-voice-level>
    </helix-flex>
  )
}
