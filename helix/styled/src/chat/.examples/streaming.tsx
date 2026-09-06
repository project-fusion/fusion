import { useCallback, useEffect, useRef, useState } from 'react'

const WORDS =
  'Three things. Button lost its width axis, the small dialog footer fits again, and nothing generated is tracked any more.'.split(
    ' ',
  )

/* The wait before the first word, and the gap between the rest. */
const FIRST = 620
const EACH = 55

const FINISHED = WORDS.join(' ')

export function Example() {
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [run, setRun] = useState(0)

  const replay = useCallback(() => setRun((before) => before + 1), [])

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    /* **The finished answer is the resting state, and that is what the cameras
       get.** `check:spec:visual` and the parity check both photograph these
       pages with reduced motion forced, so an example that is mid-stream when
       the shutter opens is a different picture every run. Settling here means
       the two syntaxes agree and a baseline means something. */
    const settle = () => {
      setSaid(FINISHED)
      setDone(true)
    }

    const start = () => {
      clearTimeout(timer.current)
      if (still.matches) {
        settle()
        return
      }
      /* Empty and `streaming` is the wait: the component draws the typing
         indicator off `[data-empty]`, so nothing here starts it. */
      setSaid('')
      setDone(false)
      let at = 0
      const next = () => {
        /* **The indicator stops because the text arrived, not because it was
           told to.** Appending the first word is the whole of it. */
        at += 1
        setSaid(WORDS.slice(0, at).join(' '))
        if (at < WORDS.length) {
          timer.current = setTimeout(next, EACH)
          return
        }
        setDone(true)
      }
      timer.current = setTimeout(next, FIRST)
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
        className="streaming"
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
          {said}
        </helix-chat-message>
      </helix-chat>

      <helix-button onClick={replay}>Replay</helix-button>
    </helix-flex>
  )
}
