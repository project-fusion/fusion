import { useState } from 'react'

const OPENING = [
  ['Day 1, 0h', 0, 1, 246],
  ['Day 1, 4h', 4, 1, 246],
  ['Day 1, 8h', 8, 1, 750],
  ['Day 1, 12h', 12, 1, 750],
  ['Day 1, 16h', 16, 1, 750],
  ['Day 1, 20h', 20, 1, 246],
  ['Day 2, 0h', 0, 2, 264],
  ['Day 2, 4h', 4, 2, 264],
  ['Day 2, 8h', 8, 2, 840],
  ['Day 2, 12h', 12, 2, 840],
  ['Day 2, 16h', 16, 2, 840],
  ['Day 2, 20h', 20, 2, 264],
  ['Day 3, 0h', 0, 3, 282],
  ['Day 3, 4h', 4, 3, 282],
  ['Day 3, 8h', 8, 3, 930],
  ['Day 3, 12h', 12, 3, 930],
  ['Day 3, 16h', 16, 3, 930],
  ['Day 3, 20h', 20, 3, 282],
  ['Day 4, 0h', 0, 4, 300],
  ['Day 4, 4h', 4, 4, 300],
  ['Day 4, 8h', 8, 4, 1020],
  ['Day 4, 12h', 12, 4, 1020],
  ['Day 4, 16h', 16, 4, 1020],
  ['Day 4, 20h', 20, 4, 300],
] as const

/* Each reading keeps its hour and its day, so the grid stays the same and the
   surface moves to its new heights. */
const shuffled = () =>
  OPENING.map(
    ([label, hour, day]) => [label, hour, day, 40 + Math.round(Math.random() * 1360)] as const,
  )

export function Example() {
  /* The numbers change in the table. The chart reads the table and moves to
     the new numbers. */
  const [readings, setReadings] =
    useState<ReadonlyArray<readonly [string, number, number, number]>>(OPENING)
  const refresh = () => setReadings(shuffled())

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="load"
      >
        <caption>Requests a minute by hour and day</caption>
        <thead>
          <tr>
            <th scope="col">Reading</th>
            <th scope="col">Hour</th>
            <th scope="col">Day</th>
            <th scope="col">Requests a minute</th>
          </tr>
        </thead>
        <tbody>
          {readings.map(([label, hour, day, load]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td data-value={hour}>{hour}</td>
              <td data-value={day}>{day}</td>
              <td data-value={load}>{load}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <helix-spatial-surface-chart
        for="load"
        grow
        label="Requests a minute by hour and day"
      ></helix-spatial-surface-chart>

      <helix-button onClick={refresh}>Refresh data</helix-button>
    </helix-flex>
  )
}
