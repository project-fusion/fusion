export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="stacked-traffic"
      >
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
          <tr>
            <th scope="row">W3</th>
            <td>1502</td>
            <td>1030</td>
            <td>287</td>
          </tr>
        </tbody>
      </table>
      <helix-bar-chart
        for="stacked-traffic"
        stacked
      ></helix-bar-chart>
      <helix-legend for="stacked-traffic"></helix-legend>
    </helix-flex>
  )
}
