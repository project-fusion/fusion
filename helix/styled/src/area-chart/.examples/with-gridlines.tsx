export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="areachartgrid"
      >
        <caption>Gigabytes stored by tier</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Hot</th>
            <th scope="col">Warm</th>
            <th scope="col">Cold</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">W1</th>
            <td data-value="120">120</td>
            <td data-value="240">240</td>
            <td data-value="410">410</td>
          </tr>
          <tr>
            <th scope="row">W2</th>
            <td data-value="150">150</td>
            <td data-value="260">260</td>
            <td data-value="470">470</td>
          </tr>
          <tr>
            <th scope="row">W3</th>
            <td data-value="140">140</td>
            <td data-value="310">310</td>
            <td data-value="540">540</td>
          </tr>
          <tr>
            <th scope="row">W4</th>
            <td data-value="190">190</td>
            <td data-value="330">330</td>
            <td data-value="620">620</td>
          </tr>
          <tr>
            <th scope="row">W5</th>
            <td data-value="210">210</td>
            <td data-value="360">360</td>
            <td data-value="710">710</td>
          </tr>
          <tr>
            <th scope="row">W6</th>
            <td data-value="230">230</td>
            <td data-value="400">400</td>
            <td data-value="790">790</td>
          </tr>
        </tbody>
      </table>

      <helix-area-chart
        for="areachartgrid"
        gridlines="value"
      ></helix-area-chart>
    </helix-flex>
  )
}
