export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="linecharttip"
      >
        <caption>Sessions by channel</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Direct</th>
            <th scope="col">Referral</th>
            <th scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Jan</th>
            <td data-value="1180">1,180</td>
            <td data-value="940">940</td>
            <td>Launch</td>
          </tr>
          <tr>
            <th scope="row">Feb</th>
            <td data-value="1240">1,240</td>
            <td data-value="1010">1,010</td>
            <td>&mdash;</td>
          </tr>
          <tr>
            <th scope="row">Mar</th>
            <td data-value="1190">1,190</td>
            <td data-value="1080">1,080</td>
            <td>Outage</td>
          </tr>
          <tr>
            <th scope="row">Apr</th>
            <td data-value="1320">1,320</td>
            <td data-value="1040">1,040</td>
            <td>&mdash;</td>
          </tr>
          <tr>
            <th scope="row">May</th>
            <td data-value="1410">1,410</td>
            <td data-value="1160">1,160</td>
            <td>Press</td>
          </tr>
          <tr>
            <th scope="row">Jun</th>
            <td data-value="1380">1,380</td>
            <td data-value="1250">1,250</td>
            <td>&mdash;</td>
          </tr>
        </tbody>
      </table>

      <helix-line-chart for="linecharttip"></helix-line-chart>
    </helix-flex>
  )
}
