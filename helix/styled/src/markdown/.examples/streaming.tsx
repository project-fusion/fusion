import { useCallback, useEffect, useRef, useState } from 'react'
import './streaming.css'

const REPLY = [
  'Add it in **three steps**, so no query ever waits on a lock:',
  '',
  '1. Add the column as nullable.',
  '2. Backfill it in batches.',
  '3. Add the constraint once every row has a value.',
  '',
  '```sql',
  'alter table users add column plan text;',
  "update users set plan = 'free' where id between 1 and 10000;",
  'alter table users alter column plan set not null;',
  '```',
  '',
  '| Step | Locks | Time on 10M rows |',
  '| :-- | :-- | --: |',
  '| Add column | Brief | Under 1 s |',
  '| Backfill | Row locks, batch by batch | About 4 min |',
  '| Constraint | A scan, no writes blocked | About 20 s |',
  '',
  '> [!TIP]',
  '> Run the backfill during a quiet hour if you can.',
].join('\n')

/* A few characters at a time, as a model's tokens arrive. */
const EACH = 24

export function Example() {
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)
  const [run, setRun] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const replay = useCallback(() => setRun((before) => before + 1), [])

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const start = () => {
      clearTimeout(timer.current)
      if (still.matches) {
        setSaid(REPLY)
        setDone(true)
        return
      }
      setSaid('')
      setDone(false)
      let at = 0
      const next = () => {
        at += 2 + Math.floor(Math.random() * 6)
        if (at >= REPLY.length) {
          setSaid(REPLY)
          setDone(true)
          return
        }
        setSaid(REPLY.slice(0, at))
        timer.current = setTimeout(next, EACH)
      }
      timer.current = setTimeout(next, EACH)
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
          How do I add a column without downtime?
        </helix-chat-message>
        <helix-chat-message
          author="them"
          data-prose
          separation="plain"
          state={done ? 'sent' : 'streaming'}
        >
          {/* Set `text` to the whole reply so far: only its new end is drawn. */}
          <helix-markdown
            streaming={!done}
            text={said}
          />
        </helix-chat-message>
      </helix-chat>

      <helix-button onClick={replay}>Replay the reply</helix-button>
    </helix-flex>
  )
}
