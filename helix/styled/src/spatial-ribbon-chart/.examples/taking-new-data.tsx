import { useState } from 'react'

const NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const OPENING = [
  [92, 120, 180],
  [88, 126, 176],
  [95, 118, 190],
  [110, 131, 205],
  [104, 140, 198],
  [86, 112, 172],
  [84, 108, 168],
]
const RANGES = [
  [70, 140],
  [90, 170],
  [150, 240],
]

export function Example() {
  /* The numbers change in the table. The chart reads the table and moves to
     the new numbers. */
  const [rows, setRows] = useState(OPENING)
  const refresh = () =>
    setRows(
      NAMES.map(() =>
        RANGES.map(([low = 0, high = 0]) => low + Math.round(Math.random() * (high - low))),
      ),
    )

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="latency"
      >
        <caption>Response time by region</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Frankfurt (ms)</th>
            <th scope="col">Virginia (ms)</th>
            <th scope="col">Singapore (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={NAMES[index]}>
              <th scope="row">{NAMES[index]}</th>
              {row.map((value, column) => (
                <td
                  data-value={value}
                  key={column}
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <helix-spatial-ribbon-chart
        for="latency"
        grow
        label="Response time by region"
      ></helix-spatial-ribbon-chart>

      <helix-button onClick={refresh}>Refresh data</helix-button>
    </helix-flex>
  )
}
