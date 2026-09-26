import { useCallback, useEffect, useRef, useState } from 'react'

const WORDS =
  'Three things. The settings page loads faster, invoices export as CSV, and deleted projects are not tracked any more.'.split(
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

    /* With reduced motion, the finished answer is shown at once. */
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
      /* An empty turn with `state="streaming"` shows the typing indicator. */
      setSaid('')
      setDone(false)
      let at = 0
      const next = () => {
        /* The indicator stops when the first word arrives. */
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
          What changed in the last release?
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
