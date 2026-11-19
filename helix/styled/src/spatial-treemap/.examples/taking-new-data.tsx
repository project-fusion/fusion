import { useState } from 'react'

const NAMES = ['Search', 'Checkout', 'Accounts', 'Catalog', 'Images', 'Payments']
const OPENING: Array<[string, number, number]> = [
  ['Web', 4200, 180],
  ['Web', 2600, 320],
  ['Core', 1800, 140],
  ['Core', 3100, 210],
  ['Media', 2200, 90],
  ['Core', 1500, 380],
]
const RANGES = [
  [800, 5000],
  [60, 420],
]

export function Example() {
  /* The numbers change in the table. The chart reads the table and moves to
     the new numbers. */
  const [rows, setRows] = useState(OPENING)
  const refresh = () =>
    setRows(
      rows.map(
        ([team]) =>
          [
            team,
            ...RANGES.map(([low = 0, high = 0]) => low + Math.round(Math.random() * (high - low))),
          ] as [string, number, number],
      ),
    )

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="services"
      >
        <caption>Requests and response time by service</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Team</th>
            <th scope="col">Requests</th>
            <th scope="col">p95 response (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([team, ...values], index) => (
            <tr key={NAMES[index]}>
              <th scope="row">{NAMES[index]}</th>
              <td>{team}</td>
              {values.map((value, column) => (
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

      <helix-spatial-treemap
        for="services"
        group-by="Team"
        grow
        label="Requests and response time by service"
      ></helix-spatial-treemap>

      <helix-button onClick={refresh}>Refresh data</helix-button>
    </helix-flex>
  )
}
