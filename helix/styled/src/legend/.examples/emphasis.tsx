export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="revenue">
        <caption>Revenue by quarter</caption>
        <thead>
          <tr>
            <th>Quarter</th>
            <th>Booked</th>
            <th>Renewals</th>
            <th>Forecast</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td>420</td>
            <td>310</td>
            <td>180</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td>488</td>
            <td>352</td>
            <td>240</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td>531</td>
            <td>390</td>
            <td>296</td>
          </tr>
        </tbody>
      </table>
      <helix-bar-chart for="revenue" outlined="Forecast" subtle="Renewals"></helix-bar-chart>
      <helix-legend for="revenue" outlined="Forecast" subtle="Renewals"></helix-legend>
    </helix-flex>
  )
}
