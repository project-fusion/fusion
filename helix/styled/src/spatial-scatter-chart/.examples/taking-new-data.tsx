import { useState } from 'react'

const NAMES = ['Ada', 'Grace', 'Lin', 'Mae', 'Noor', 'Omar', 'Rui', 'Sven']
const OPENING = [
  [24, 3, 420],
  [31, 6, 980],
  [38, 8, 1450],
  [45, 5, 1120],
  [52, 9, 2100],
  [29, 2, 360],
  [61, 7, 1680],
  [35, 4, 760],
]
const RANGES = [
  [20, 70],
  [1, 12],
  [200, 2800],
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
            <th scope="col">Visits a month</th>
            <th scope="col">Yearly spend</th>
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
