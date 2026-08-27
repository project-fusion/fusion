import { useState } from 'react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const OPENING = [1180, 1240, 1190, 1320, 1410, 1380]

export function Example() {
  /* The numbers are rewritten in the table, which is the only thing a chart
     reads. Nothing here touches the chart. */
  const [sessions, setSessions] = useState(OPENING)

  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="live">
        <caption>Sessions a month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Sessions</th>
          </tr>
        </thead>
        <tbody>
          {MONTHS.map((month, index) => (
            <tr key={month}>
              <th scope="row">{month}</th>
              <td data-value={sessions[index]}>{sessions[index].toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <helix-line-chart curve="smooth" for="live" />

      <helix-button
        emphasis="solid"
        onClick={() => setSessions(MONTHS.map(() => 900 + Math.round(Math.random() * 700)))}
        tone="primary"
      >
        New numbers
      </helix-button>
    </helix-flex>
  )
}
