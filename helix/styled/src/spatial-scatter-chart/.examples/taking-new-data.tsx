import { useState } from 'react'

const NAMES = [
  'Ada',
  'Grace',
  'Lin',
  'Mae',
  'Noor',
  'Omar',
  'Rui',
  'Sven',
  'Tess',
  'Uma',
  'Vic',
  'Wen',
]
const OPENING = [
  [24, 420, 3],
  [31, 980, 6],
  [38, 1450, 8],
  [45, 1120, 5],
  [52, 2100, 9],
  [29, 360, 2],
  [61, 1680, 7],
  [35, 760, 4],
  [42, 1300, 6],
  [27, 540, 3],
  [56, 1900, 8],
  [48, 1250, 5],
]
const RANGES = [
  [20, 70],
  [200, 2800],
  [1, 12],
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
        id="shoppers"
      >
        <caption>Shoppers by age, visits, and spend</caption>
        <thead>
          <tr>
            <th scope="col">Shopper</th>
            <th scope="col">Age</th>
            <th scope="col">Yearly spend</th>
            <th scope="col">Visits a month</th>
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

      <helix-spatial-scatter-chart
        for="shoppers"
        grow
        label="Shoppers by age, visits, and spend"
      ></helix-spatial-scatter-chart>

      <helix-button onClick={refresh}>Refresh data</helix-button>
    </helix-flex>
  )
}
