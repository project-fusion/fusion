import './from-a-table.css'

export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="deploys">
        <caption>Deploys per day</caption>
        <tbody>
          <tr>
            <th scope="row">
              <time datetime="2026-08-15">Sat</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time datetime="2026-08-16">Sun</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time datetime="2026-08-17">Mon</time>
            </th>
            <td>12</td>
          </tr>
          <tr>
            <th scope="row">
              <time datetime="2026-08-18">Tue</time>
            </th>
            <td>9</td>
          </tr>
          <tr>
            <th scope="row">
              <time datetime="2026-08-19">Wed</time>
            </th>
            <td>14</td>
          </tr>
          <tr>
            <th scope="row">
              <time datetime="2026-08-20">Thu</time>
            </th>
            <td>11</td>
          </tr>
          <tr>
            <th scope="row">
              <time datetime="2026-08-21">Fri</time>
            </th>
            <td>17</td>
          </tr>
        </tbody>
      </table>
      <helix-sparkline for="deploys"></helix-sparkline>
    </helix-flex>
  )
}
