import { useCallback, useEffect, useRef, useState } from 'react'

const WORDS =
  'Three things. Button lost its width axis, the small dialog footer fits again, and nothing generated is tracked any more.'.split(
    ' ',
  )

/* What the agent is doing, and how long each takes. The orb carries one into
   the next rather than cutting between them, which is the whole reason to spend
   a canvas on this instead of swapping an icon. */
const RUN = [
  ['connecting', 'Connecting', 700],
  ['fetching', 'Reading the release', 1100],
  ['thinking', 'Working out what changed', 1100],
] as const

const FINISHED = WORDS.join(' ')

export function Example() {
  const [state, setState] = useState<string>('connecting')
  const [doing, setDoing] = useState('Connecting')
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [run, setRun] = useState(0)

  const replay = useCallback(() => setRun((before) => before + 1), [])

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    const say = (next: string, what: string) => {
      setState(next)
      setDoing(what)
    }

    /* **The finished answer is the resting state.** These pages are
       photographed with reduced motion forced, so an example still mid-sentence
       when the shutter opens is a different picture every run. */
    const settle = () => {
      say('done', 'Done')
      setSaid(FINISHED)
      setDone(true)
    }

    const stream = () => {
      let at = 0
      const next = () => {
        /* **The orb goes out as the first word lands, and the component is what
           decides that.** It sits in the turn's `indicator` slot, which is shown
           while the turn is streaming and empty and hidden the moment it is not,
           so nothing here has to hide it: the text arriving is the signal, and
           it is the same signal that used to stop the three dots. */
        at += 1
        setSaid(WORDS.slice(0, at).join(' '))
        if (at < WORDS.length) {
          timer.current = setTimeout(next, 55)
          return
        }
        say('done', 'Done')
        setDone(true)
      }
      next()
    }

    const start = () => {
      clearTimeout(timer.current)
      if (still.matches) {
        settle()
        return
      }
      setSaid('')
      setDone(false)
      let step = 0
      const advance = () => {
        if (step === RUN.length) {
          say('working', 'Writing')
          stream()
          return
        }
        const [next, what, held] = RUN[step]
        say(next, what)
        step += 1
        timer.current = setTimeout(advance, held)
      }
      advance()
    }

    start()
    still.addEventListener('change', start)
    return () => {
      clearTimeout(timer.current)
      still.removeEventListener('change', start)
    }
  }, [run])

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-chat
        className="agent"
        label="Assistant"
      >
        <strong slot="header">Assistant</strong>
        <helix-chat-message
          author="me"
          state="sent"
        >
          What went out in the last deploy?
        </helix-chat-message>
        <helix-chat-message
          author="them"
          separation="plain"
          state={done ? 'sent' : 'streaming'}
        >
          <helix-orb
            size="sm"
            slot="indicator"
            state={state}
          ></helix-orb>
          {said}
        </helix-chat-message>

        <span slot="status">{doing}</span>
      </helix-chat>

      <helix-button onClick={replay}>Replay</helix-button>
    </helix-flex>
  )
}
