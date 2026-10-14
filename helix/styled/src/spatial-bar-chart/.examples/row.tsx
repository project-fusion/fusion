export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="calls"
      >
        <caption>Tokens per call</caption>
        <thead>
          <tr>
            <th scope="col">Call</th>
            <th scope="col">Cached input</th>
            <th scope="col">New input</th>
            <th scope="col">Output</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">1</th>
            <td>0</td>
            <td>9200</td>
            <td>410</td>
          </tr>
          <tr>
            <th scope="row">2</th>
            <td>8800</td>
            <td>1400</td>
            <td>620</td>
          </tr>
          <tr>
            <th scope="row">3</th>
            <td>10100</td>
            <td>900</td>
            <td>380</td>
          </tr>
          <tr>
            <th scope="row">4</th>
            <td>11000</td>
            <td>2600</td>
            <td>940</td>
          </tr>
          <tr>
            <th scope="row">5</th>
            <td>13500</td>
            <td>700</td>
            <td>300</td>
          </tr>
          <tr>
            <th scope="row">6</th>
            <td>14100</td>
            <td>3100</td>
            <td>1200</td>
          </tr>
        </tbody>
      </table>
      <helix-spatial-bar-chart
        for="calls"
        label="Tokens per call"
        stacked
        variant="row"
      ></helix-spatial-bar-chart>
    </>
  )
}
