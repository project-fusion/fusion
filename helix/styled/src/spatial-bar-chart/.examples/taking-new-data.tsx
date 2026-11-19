import { useState } from 'react'

const NAMES = ['North', 'South', 'East', 'West']
const OPENING = [
  [420, 465, 510],
  [310, 355, 340],
  [520, 560, 615],
  [260, 300, 345],
]
const RANGES = [
  [200, 700],
  [200, 700],
  [200, 700],
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
        id="signups"
      >
        <caption>Signups by region and quarter</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Q1</th>
            <th scope="col">Q2</th>
            <th scope="col">Q3</th>
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

      <helix-spatial-bar-chart
        for="signups"
        grow
        label="Signups by region and quarter"
      ></helix-spatial-bar-chart>

      <helix-button onClick={refresh}>Refresh data</helix-button>
    </helix-flex>
  )
}
