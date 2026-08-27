export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="channels">
        <caption>Sessions by channel</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Direct</th>
            <th scope="col">Referral</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Jan</th>
            <td data-value="1180">1180</td>
            <td data-value="940">940</td>
          </tr>
          <tr>
            <th scope="row">Feb</th>
            <td data-value="1240">1240</td>
            <td data-value="1010">1010</td>
          </tr>
          <tr>
            <th scope="row">Mar</th>
            <td data-value="1190">1190</td>
            <td data-value="1080">1080</td>
          </tr>
          <tr>
            <th scope="row">Apr</th>
            <td data-value="1320">1320</td>
            <td data-value="1040">1040</td>
          </tr>
          <tr>
            <th scope="row">May</th>
            <td data-value="1410">1410</td>
            <td data-value="1160">1160</td>
          </tr>
          <tr>
            <th scope="row">Jun</th>
            <td data-value="1380">1380</td>
            <td data-value="1250">1250</td>
          </tr>
        </tbody>
      </table>

      <helix-line-chart for="channels"></helix-line-chart>
      <helix-legend for="channels"></helix-legend>
    </helix-flex>
  )
}
