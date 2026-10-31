import type { OrbState } from '@fusion.dev/helix'
import { useCallback, useEffect, useRef, useState } from 'react'

const WORDS =
  'Three things. The settings page loads faster, invoices export as CSV, and deleted projects are not tracked any more.'.split(
    ' ',
  )

/* Each step's orb state, label, and duration in milliseconds. */
const RUN = [
  ['connecting', 'Connecting', 700],
  ['fetching', 'Reading the release notes', 1100],
  ['thinking', 'Comparing versions', 1100],
] as const

const FINISHED = WORDS.join(' ')

export function Example() {
  const [state, setState] = useState<OrbState>('connecting')
  const [doing, setDoing] = useState('Connecting')
  const [said, setSaid] = useState('')
  const [done, setDone] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [run, setRun] = useState(0)

  const replay = useCallback(() => setRun((before) => before + 1), [])

  useEffect(() => {
    const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')

    const say = (next: OrbState, what: string) => {
      setState(next)
      setDoing(what)
    }

    /* With reduced motion, the finished answer is shown at once. */
    const settle = () => {
      say('done', 'Done')
      setSaid(FINISHED)
      setDone(true)
    }

    const stream = () => {
      let at = 0
      const next = () => {
        /* The turn hides its `indicator` slot as soon as it has content. */
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
      if (still?.matches) {
        settle()
        return
      }
      setSaid('')
      setDone(false)
      let step = 0
      const advance = () => {
        const stage = RUN[step]
        if (stage === undefined) {
          say('working', 'Writing')
          stream()
          return
        }
        const [next, what, held] = stage
        say(next, what)
        step += 1
        timer.current = setTimeout(advance, held)
      }
      advance()
    }

    start()
    still?.addEventListener('change', start)
    return () => {
      clearTimeout(timer.current)
      still?.removeEventListener('change', start)
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
          Why did the last build fail?
        </helix-chat-message>
        <helix-chat-message
          author="them"
          author-label="Assistant"
          separation="plain"
          state="sent"
        >
          <helix-log
            label="Work"
            quiet
            separation="plain"
            slot="work"
            wrap
          >
            <helix-log-group
              default-open
              heading="Worked for 38s"
              status="done"
            >
              <helix-log-line>Reading the failed run before any code.</helix-log-line>
              <helix-log-group
                duration="4s"
                heading="Read the run's log"
                status="done"
              >
                <helix-log-line>$ gh run view 38021681000 --log-failed</helix-log-line>
                <helix-log-line level="error">
                  Error: Cannot find module './checkout/summary'
                </helix-log-line>
              </helix-log-group>
              <helix-log-group
                duration="2s"
                heading="Searched the code"
                status="done"
              >
                <helix-log-line>$ rg "checkout/summary" src</helix-log-line>
                <helix-log-line>
                  src/checkout/index.ts:3: import {'{ Summary }'} from './checkout/summary'
                </helix-log-line>
              </helix-log-group>
            </helix-log-group>
          </helix-log>
          The build imports ./checkout/summary from inside src/checkout, so it looks for
          src/checkout/checkout/summary, which does not exist. Changing the import to ./summary
          fixes it.
        </helix-chat-message>
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
          <helix-flex
            align-items="center"
            gap="xs"
            slot="indicator"
          >
            <helix-orb
              size="sm"
              state={state}
            ></helix-orb>
            <span>{doing}</span>
          </helix-flex>
          {said}
        </helix-chat-message>
      </helix-chat>

      <helix-button onClick={replay}>Replay</helix-button>
    </helix-flex>
  )
}
