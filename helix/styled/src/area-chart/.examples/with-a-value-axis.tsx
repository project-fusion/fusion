export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="sources-axis"
      >
        <caption>Visits by source</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Search</th>
            <th scope="col">Direct</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Jan</th>
            <td data-value="620">620</td>
            <td data-value="380">380</td>
          </tr>
          <tr>
            <th scope="row">Feb</th>
            <td data-value="700">700</td>
            <td data-value="410">410</td>
          </tr>
          <tr>
            <th scope="row">Mar</th>
            <td data-value="660">660</td>
            <td data-value="520">520</td>
          </tr>
          <tr>
            <th scope="row">Apr</th>
            <td data-value="740">740</td>
            <td data-value="560">560</td>
          </tr>
        </tbody>
      </table>

      <helix-area-chart
        for="sources-axis"
        share
        value-axis
      ></helix-area-chart>
    </helix-flex>
  )
}
