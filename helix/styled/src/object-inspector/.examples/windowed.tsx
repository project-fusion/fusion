const EVENTS = Array.from({ length: 10000 }, (_, at) => ({
  id: at + 1,
  ok: at % 7 !== 0,
  type: at % 3 === 0 ? 'deploy' : 'build',
}))

export function Example() {
  return (
    <helix-object-inspector
      label="events.json"
      value={EVENTS}
      windowed
    ></helix-object-inspector>
  )
}
