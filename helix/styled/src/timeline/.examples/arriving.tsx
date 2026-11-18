import { useState } from 'react'

interface Event {
  time: string
  title: string
  tone: 'danger' | 'primary' | 'success'
}

const OPENING: Event[] = [
  { time: '09:12', title: 'Deployed version 4.2.0', tone: 'success' },
  { time: '08:47', title: 'Rolled back', tone: 'danger' },
  { time: '08:30', title: 'Build passed', tone: 'primary' },
]

/** The time five minutes after `time`. */
const later = (time: string): string => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const total = hours * 60 + minutes + 5
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function Example() {
  /* Each deploy joins at the top, five minutes after the one before. Past
     four events the oldest leaves. */
  const [events, setEvents] = useState(OPENING)
  const [version, setVersion] = useState(0)
  const deploy = () => {
    const next = version + 1
    setVersion(next)
    setEvents((before) =>
      [
        {
          time: later(before[0]?.time ?? '09:12'),
          title: `Deployed version 4.2.${next}`,
          tone: 'success' as const,
        },
        ...before,
      ].slice(0, 4),
    )
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-timeline label="Deployment history">
        {events.map((event) => (
          <helix-timeline-item
            datetime={`2026-08-19T${event.time}`}
            key={event.time}
            tone={event.tone}
          >
            <span slot="time">{event.time}</span>
            <helix-text scale="body-strong">{event.title}</helix-text>
          </helix-timeline-item>
        ))}
      </helix-timeline>
      <helix-button onClick={deploy}>Deploy</helix-button>
    </helix-flex>
  )
}
