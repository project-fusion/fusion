export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="sources"
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
            <td data-value="3820">3,820</td>
            <td data-value="1204">1,204</td>
            <td data-value="240">240</td>
          </tr>
          <tr>
            <th scope="row">W2</th>
            <td data-value="4105">4,105</td>
            <td data-value="1388">1,388</td>
            <td data-value="221">221</td>
          </tr>
          <tr>
            <th scope="row">W3</th>
            <td data-value="3960">3,960</td>
            <td data-value="1502">1,502</td>
            <td data-value="287">287</td>
          </tr>
          <tr>
            <th scope="row">W4</th>
            <td data-value="4410">4,410</td>
            <td data-value="1420">1,420</td>
            <td data-value="310">310</td>
          </tr>
          <tr>
            <th scope="row">W5</th>
            <td data-value="4620">4,620</td>
            <td data-value="1610">1,610</td>
            <td data-value="298">298</td>
          </tr>
          <tr>
            <th scope="row">W6</th>
            <td data-value="4890">4,890</td>
            <td data-value="1702">1,702</td>
            <td data-value="342">342</td>
          </tr>
        </tbody>
      </table>

      <helix-line-chart for="sources"></helix-line-chart>
      <helix-legend
        for="sources"
        toggles
      ></helix-legend>
    </helix-flex>
  )
}
