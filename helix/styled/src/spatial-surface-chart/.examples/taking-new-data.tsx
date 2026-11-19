import { useState } from 'react'

const OPENING = [
  ['Day 1, 0h', 0, 1, 120],
  ['Day 1, 3h', 3, 1, 123],
  ['Day 1, 6h', 6, 1, 166],
  ['Day 1, 9h', 9, 1, 409],
  ['Day 1, 12h', 12, 1, 786],
  ['Day 1, 15h', 15, 1, 684],
  ['Day 1, 18h', 18, 1, 296],
  ['Day 1, 21h', 21, 1, 140],
  ['Day 2, 0h', 0, 2, 120],
  ['Day 2, 3h', 3, 2, 123],
  ['Day 2, 6h', 6, 2, 175],
  ['Day 2, 9h', 9, 2, 464],
  ['Day 2, 12h', 12, 2, 911],
  ['Day 2, 15h', 15, 2, 789],
  ['Day 2, 18h', 18, 2, 328],
  ['Day 2, 21h', 21, 2, 144],
  ['Day 3, 0h', 0, 3, 120],
  ['Day 3, 3h', 3, 3, 124],
  ['Day 3, 6h', 6, 3, 184],
  ['Day 3, 9h', 9, 3, 518],
  ['Day 3, 12h', 12, 3, 1036],
  ['Day 3, 15h', 15, 3, 895],
  ['Day 3, 18h', 18, 3, 361],
  ['Day 3, 21h', 21, 3, 148],
  ['Day 4, 0h', 0, 4, 120],
  ['Day 4, 3h', 3, 4, 124],
  ['Day 4, 6h', 6, 4, 192],
  ['Day 4, 9h', 9, 4, 572],
  ['Day 4, 12h', 12, 4, 1161],
  ['Day 4, 15h', 15, 4, 1001],
  ['Day 4, 18h', 18, 4, 394],
  ['Day 4, 21h', 21, 4, 151],
  ['Day 5, 0h', 0, 5, 120],
  ['Day 5, 3h', 3, 5, 124],
  ['Day 5, 6h', 6, 5, 184],
  ['Day 5, 9h', 9, 5, 518],
  ['Day 5, 12h', 12, 5, 1036],
  ['Day 5, 15h', 15, 5, 895],
  ['Day 5, 18h', 18, 5, 361],
  ['Day 5, 21h', 21, 5, 148],
  ['Day 6, 0h', 0, 6, 120],
  ['Day 6, 3h', 3, 6, 123],
  ['Day 6, 6h', 6, 6, 175],
  ['Day 6, 9h', 9, 6, 464],
  ['Day 6, 12h', 12, 6, 911],
  ['Day 6, 15h', 15, 6, 789],
  ['Day 6, 18h', 18, 6, 328],
  ['Day 6, 21h', 21, 6, 144],
  ['Day 7, 0h', 0, 7, 120],
  ['Day 7, 3h', 3, 7, 123],
  ['Day 7, 6h', 6, 7, 166],
  ['Day 7, 9h', 9, 7, 409],
  ['Day 7, 12h', 12, 7, 786],
  ['Day 7, 15h', 15, 7, 684],
  ['Day 7, 18h', 18, 7, 296],
  ['Day 7, 21h', 21, 7, 140],
] as const

/* Each reading keeps its hour and its day, so the grid stays the same and the
   surface moves to its new heights. The busiest hour moves, and so does the
   busiest day. */
const shuffled = () => {
  const peak = 6 + Math.random() * 12
  const busiest = 1 + Math.random() * 6
  return OPENING.map(([label, hour, day]) => {
    const fall = Math.exp(-((hour - peak) ** 2) / 18)
    return [
      label,
      hour,
      day,
      Math.round(120 + 1100 * fall * (1 - Math.abs(day - busiest) * 0.12)),
    ] as const
  })
}

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
