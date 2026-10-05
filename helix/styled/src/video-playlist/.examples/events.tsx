import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps this many of the most recent rows.
const KEEP = 6

const RESTING: Arrival[] = [{ carried: 'Choose another clip', name: 'No events yet' }]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  const proposed = (event: CustomEvent<{ value: string }>) => {
    say('helix-before-activate', `about to change to "${event.detail.value}", can be canceled`)
  }

  /* The playlist stops each entry's `helix-select`, so listen for
     `helix-activate` on the playlist. */
  const moved = (event: CustomEvent<{ value: string }>) => {
    say('helix-activate', `"${event.detail.value}" is now playing`)
  }

  const finished = () => {
    say('helix-end', 'the last clip finished, and the playlist stopped there')
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-video-playlist
        default-active="one"
        label="Episodes"
        onhelix-activate={moved}
        onhelix-before-activate={proposed}
        onhelix-end={finished}
      >
        <helix-video
          extra-controls="previous next"
          label="Episode player"
          slot="player"
        />
        <helix-video-playlist-item value="one">Setting up your account</helix-video-playlist-item>
        <helix-video-playlist-item value="two">Inviting your team</helix-video-playlist-item>
      </helix-video-playlist>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="description">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
