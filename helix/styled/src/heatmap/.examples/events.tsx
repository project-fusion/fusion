import { useState } from 'react'

type Arrival = { carried: string; name: string }

// The log keeps the last six events.
const KEEP = 6

const RESTING: Arrival[] = [
  { carried: 'Resize the window to change how many cells fit', name: 'No events yet' },
]

export function Example() {
  const [heard, setHeard] = useState(RESTING)

  const say = (name: string, carried: string) => {
    setHeard((before) => {
      const kept = before === RESTING ? [] : before
      return [...kept, { carried, name }].slice(-KEEP)
    })
  }

  /* `helix-resize` cannot be canceled. It reports how many cells the grid can
     show. */
  const measured = (event: CustomEvent<{ size: number }>) => {
    say('helix-resize', `${event.detail.size} cells fit`)
  }

  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-heatmap
        for="uptime"
        label="Uptime, last 30 days"
        onhelix-resize={measured}
      >
        <table
          data-hidden-visually
          id="uptime"
        >
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
            <tr>
              <th scope="row">2026-08-04</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-05</th>
              <td>99</td>
            </tr>
            <tr>
              <th scope="row">2026-08-06</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-07</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-08</th>
              <td>97</td>
            </tr>
            <tr>
              <th scope="row">2026-08-09</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-10</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-11</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-12</th>
              <td>99</td>
            </tr>
            <tr>
              <th scope="row">2026-08-13</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-14</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-15</th>
              <td>95</td>
            </tr>
            <tr>
              <th scope="row">2026-08-16</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-17</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-18</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-19</th>
              <td>98</td>
            </tr>
            <tr>
              <th scope="row">2026-08-20</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-21</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-22</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-23</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-24</th>
              <td>99</td>
            </tr>
            <tr>
              <th scope="row">2026-08-25</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-26</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-27</th>
              <td>96</td>
            </tr>
            <tr>
              <th scope="row">2026-08-28</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-29</th>
              <td>100</td>
            </tr>
            <tr>
              <th scope="row">2026-08-30</th>
              <td>100</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>

      <helix-list
        divided
        label="Events"
      >
        {heard.map((one, at) => (
          <helix-list-item key={`${one.name}-${at}`}>
            {one.name}
            <span slot="description">{one.carried}</span>
          </helix-list-item>
        ))}
      </helix-list>
    </helix-flex>
  )
}
