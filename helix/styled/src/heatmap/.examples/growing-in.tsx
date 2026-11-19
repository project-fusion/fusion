import { useState } from 'react'

/* Four weeks of commits, one day a row. */
const OPENING = [
  [1, 0],
  [2, 7],
  [3, 4],
  [4, 1],
  [5, 8],
  [6, 5],
  [7, 2],
  [8, 9],
  [9, 6],
  [10, 3],
  [11, 0],
  [12, 7],
  [13, 4],
  [14, 1],
  [15, 8],
  [16, 5],
  [17, 2],
  [18, 9],
  [19, 6],
  [20, 3],
  [21, 0],
  [22, 7],
  [23, 4],
  [24, 1],
  [25, 8],
  [26, 5],
  [27, 2],
  [28, 9],
]

export function Example() {
  /* A new day goes at the end and the oldest leaves, so the strip keeps four
     weeks. The new day grows in. */
  const [days, setDays] = useState(OPENING)
  const add = () =>
    setDays((before) => {
      const last = before.at(-1)?.[0] ?? 0
      return [...before.slice(1), [last + 1, Math.round(Math.random() * 10)]]
    })

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-heatmap
        for="commits"
        grow
        label="Commits, last four weeks"
        rows={7}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table
          data-hidden-visually
          id="commits"
        >
          <caption>Commits</caption>
          <tbody>
            {days.map(([day, commits]) => (
              <tr key={day}>
                <th scope="row">Day {day}</th>
                <td>{commits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </helix-heatmap>

      <helix-button onClick={add}>Add a day</helix-button>
    </helix-flex>
  )
}
