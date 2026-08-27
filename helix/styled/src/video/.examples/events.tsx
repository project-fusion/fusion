import { useRef, useState } from 'react'

type Arrival = { carried: string; name: string }

const RESTING: Arrival[] = [{ carried: 'Press play', name: 'Nothing yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)
  const clip = useRef<HelixVideo>(null)

  const say = (name: string) => {
    const player = clip.current
    const carried = player
      ? `${Math.round(player.currentTime)}s of ${Math.round(player.duration) || 0}s`
      : ''
    setHeard((before) => [...(before === RESTING ? [] : before), { carried, name }].slice(-6))
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

  return (
    <helix-flex direction="column" gap="md">
      <helix-video
        label="A short clip"
        onEnded={finished}
        onPause={paused}
        onPlay={started}
        poster="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=960"
        ref={clip}
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4"
      />

      <helix-list divided label="What arrived">
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
