import { useCallback, useEffect, useRef, useState } from 'react'

/* The number of readings shown at once. */
const WINDOW = 24

/* Two sine waves give the HTML and React versions the same data, so their
   screenshots match. */
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
    /* With reduced motion on, the chart shows one full window and stops. */
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
      {/* Each new reading adds a row to the table and removes the oldest one.
          The chart redraws from the table. */}
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

      <helix-button onClick={run}>Restart feed</helix-button>
    </helix-flex>
  )
}
