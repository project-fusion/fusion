import { useCallback, useEffect, useRef, useState } from 'react'

/* How many readings are on screen at once, which is what makes it a window
   rather than a line that grows until it is unreadable. */
const WINDOW = 24

/* **Two sines rather than a random walk**, so the two syntaxes of this example
   draw the same line. A photographed pair is compared pixel for pixel, and
   `Math.random()` guarantees they never match. */
const reading = (at: number) => 220 + Math.round(Math.sin(at / 3) * 60 + Math.sin(at / 1.7) * 22)

const window_ = (upto: number) =>
  Array.from({ length: WINDOW }, (_, i) => {
    const at = upto - WINDOW + 1 + i
    return { at, value: reading(at) }
  })

export function Example() {
  const [rows, setRows] = useState(() => window_(WINDOW))
  const at = useRef(WINDOW)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const run = useCallback(() => {
    clearInterval(timer.current)
    at.current = WINDOW
    setRows(window_(WINDOW))
    /* **A full window and then still**, because these pages are photographed
       with reduced motion forced and a chart mid-tick is a different picture
       every run. The shape is the same either way; only the marching stops. */
    if (globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    timer.current = setInterval(() => {
      at.current += 1
      setRows(window_(at.current))
    }, 600)
  }, [])

  useEffect(() => {
    run()
    return () => clearInterval(timer.current)
  }, [run])

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      {/* **The table is the chart, and this is the whole of what streaming means
          here.** A reading arriving is a row appended and the oldest removed;
          nothing calls a method on the chart, because a chart that took data
          through an API would be a second copy of the numbers the page already
          has. It is the same contract the other examples use, driven by a
          clock. */}
      <table
        data-hidden-visually
        id="feed"
      >
        <caption>Requests a second</caption>
        <thead>
          <tr>
            <th scope="col">Second</th>
            <th scope="col">Requests</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.at}>
              <th scope="row">{row.at}s</th>
              <td data-value={String(row.value)}>{row.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <helix-line-chart
        curve="smooth"
        for="feed"
      ></helix-line-chart>

      <helix-button onClick={run}>Restart</helix-button>
    </helix-flex>
  )
}
