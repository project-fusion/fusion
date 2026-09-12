export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="runs"
      >
        <caption>Latency under load</caption>
        <thead>
          <tr>
            <th scope="col">Run</th>
            <th scope="col">Requests a second</th>
            <th scope="col">p50 (ms)</th>
            <th scope="col">p95 (ms)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Run 1</th>
            <td data-value="100">100</td>
            <td data-value="12">12</td>
            <td data-value="38">38</td>
          </tr>
          <tr>
            <th scope="row">Run 2</th>
            <td data-value="200">200</td>
            <td data-value="13">13</td>
            <td data-value="41">41</td>
          </tr>
          <tr>
            <th scope="row">Run 3</th>
            <td data-value="300">300</td>
            <td data-value="14">14</td>
            <td data-value="45">45</td>
          </tr>
          <tr>
            <th scope="row">Run 4</th>
            <td data-value="400">400</td>
            <td data-value="16">16</td>
            <td data-value="52">52</td>
          </tr>
          <tr>
            <th scope="row">Run 5</th>
            <td data-value="500">500</td>
            <td data-value="18">18</td>
            <td data-value="61">61</td>
          </tr>
          <tr>
            <th scope="row">Run 6</th>
            <td data-value="600">600</td>
            <td data-value="21">21</td>
            <td data-value="74">74</td>
          </tr>
          <tr>
            <th scope="row">Run 7</th>
            <td data-value="700">700</td>
            <td data-value="25">25</td>
            <td data-value="92">92</td>
          </tr>
          <tr>
            <th scope="row">Run 8</th>
            <td data-value="800">800</td>
            <td data-value="31">31</td>
            <td data-value="118">118</td>
          </tr>
          <tr>
            <th scope="row">Run 9</th>
            <td data-value="900">900</td>
            <td data-value="38">38</td>
            <td data-value="151">151</td>
          </tr>
          <tr>
            <th scope="row">Run 10</th>
            <td data-value="1000">1,000</td>
            <td data-value="47">47</td>
            <td data-value="196">196</td>
          </tr>
        </tbody>
      </table>

      <helix-scatter-chart
        for="runs"
        gridlines="y"
      ></helix-scatter-chart>
    </helix-flex>
  )
}
