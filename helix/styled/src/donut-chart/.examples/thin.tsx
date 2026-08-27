export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="thinned">
        <caption>Sessions by source</caption>
        <thead>
          <tr>
            <th scope="col">Source</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Direct</th>
            <td data-value="4200">4,200</td>
          </tr>
          <tr>
            <th scope="row">Search</th>
            <td data-value="3100">3,100</td>
          </tr>
          <tr>
            <th scope="row">Referral</th>
            <td data-value="1800">1,800</td>
          </tr>
          <tr>
            <th scope="row">Social</th>
            <td data-value="900">900</td>
          </tr>
        </tbody>
      </table>

      <helix-donut-chart for="thinned" hole="large">
        <helix-stat>
          10,000
          <span slot="label">Sessions</span>
        </helix-stat>
      </helix-donut-chart>
    </helix-flex>
  )
}
