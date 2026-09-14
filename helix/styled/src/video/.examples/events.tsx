import type { HelixVideo } from '@fusion.dev/helix'
import { useRef, useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Press play', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const clip = useRef<HelixVideo>(null)

  const say = (name: string) => {
    const player = clip.current
    const at = player ? Math.round(player.currentTime) : 0
    const whole = player ? Math.round(player.duration) || 0 : 0
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried: `${at}s of ${whole}s`, name }].slice(-KEEP)
    })
  }

  const started = () => {
    say('play')
  }

  const paused = () => {
    say('pause')
  }

  const finished = () => {
    say('ended')
  }

  const back = () => {
    say('helix-previous')
  }

  const on = () => {
    say('helix-next')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-video
        extra-controls="previous next"
        label="A short clip"
        onEnded={finished}
        onhelix-next={on}
        onhelix-previous={back}
        onPause={paused}
        onPlay={started}
        poster="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=960"
        ref={clip}
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      />

      <helix-list
        divided
        label="What arrived"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
