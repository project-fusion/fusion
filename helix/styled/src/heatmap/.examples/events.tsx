import { useState } from 'react'

type Arrival = { carried: string; name: string }

// How many rows the log holds, which is a choice about this preview's height.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Narrow the preview until a column drops', name: 'Nothing yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  /* Not cancelable: the grid is reporting what it can show, and the number is
     true whether or not anybody wanted it. See (303). */
  const measured = (event: CustomEvent<{ size: number }>) => {
    say('helix-resize', `${event.detail.size} cells fit, which is a report`)
  }

  return (
    <helix-flex direction="column" gap="md">
      <helix-heatmap for="uptime" label="Uptime, last 30 days" onhelix-resize={measured}>
        <table data-hidden-visually id="uptime">
          <caption>Uptime</caption>
          <tbody>
            <tr>
              <th scope="row">2026-08-01</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-02</th>
              <td>98</td>
            </tr>
            <tr>
              <th scope="row">2026-08-03</th>
              <td>100</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>

      <helix-list divided label="What arrived">
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="supporting">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
