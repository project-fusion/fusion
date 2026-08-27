export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="sessions">
        <caption>Sessions a month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Sessions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Jan</th>
            <td data-value="1180">1180</td>
          </tr>
          <tr>
            <th scope="row">Feb</th>
            <td data-value="1240">1240</td>
          </tr>
          <tr>
            <th scope="row">Mar</th>
            <td data-value="1190">1190</td>
          </tr>
          <tr>
            <th scope="row">Apr</th>
            <td data-value="1320">1320</td>
          </tr>
          <tr>
            <th scope="row">May</th>
            <td data-value="1410">1410</td>
          </tr>
          <tr>
            <th scope="row">Jun</th>
            <td data-value="1380">1380</td>
          </tr>
        </tbody>
      </table>

      <helix-line-chart for="sessions"></helix-line-chart>
    </helix-flex>
  )
}
