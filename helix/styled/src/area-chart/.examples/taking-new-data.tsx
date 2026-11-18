import { useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const OPENING = [
  [420, 180, 90],
  [460, 190, 95],
  [510, 200, 110],
  [540, 205, 120],
  [600, 215, 118],
  [650, 220, 125],
]
const RANGES = [
  [380, 700],
  [150, 260],
  [70, 150],
]

export function Example() {
  /* The numbers change in the table. The chart reads the table and redraws. */
  const [visits, setVisits] = useState(OPENING)
  const refresh = () =>
    setVisits(
      MONTHS.map(() =>
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
        id="sources"
      >
        <caption>Visits a month by source</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Search</th>
            <th scope="col">Direct</th>
            <th scope="col">Referral</th>
          </tr>
        </thead>
        <tbody>
          {visits.map((row, index) => (
            <tr key={MONTHS[index]}>
              <th scope="row">{MONTHS[index]}</th>
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

      <helix-area-chart for="sources"></helix-area-chart>

      <helix-button onClick={refresh}>Refresh data</helix-button>
    </helix-flex>
  )
}
