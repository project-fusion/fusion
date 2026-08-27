import './placement.css'

export function Example() {
  return (
    <div className="beside">
      <table data-hidden-visually id="sources">
        <caption>Visits by source</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Direct</th>
            <th scope="col">Search</th>
            <th scope="col">Referral</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">W1</th>
            <td>1204</td>
            <td>812</td>
            <td>240</td>
          </tr>
          <tr>
            <th scope="row">W2</th>
            <td>1388</td>
            <td>964</td>
            <td>221</td>
          </tr>
        </tbody>
      </table>
      <helix-bar-chart for="sources"></helix-bar-chart>
      <helix-legend for="sources" placement="start"></helix-legend>
    </div>
  )
}
