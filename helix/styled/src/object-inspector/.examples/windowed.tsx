import { useEffect } from 'react'

export function Example() {
  useEffect(() => {
    const events = document.getElementById('events') as HTMLElement & { value: unknown }
    events.value = Array.from({ length: 10000 }, (_, at) => ({
      id: at + 1,
      ok: at % 7 !== 0,
      type: at % 3 === 0 ? 'deploy' : 'build',
    }))
  }, [])

  return (
    <helix-object-inspector
      id="events"
      label="events.json"
      windowed
    ></helix-object-inspector>
  )
}
