export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="visits"
      >
        <caption>Visits a month by source</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Search</th>
            <th scope="col">Direct</th>
            <th scope="col">Referral</th>
            <th scope="col">Social</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Jan</th>
            <td data-value="420">420</td>
            <td data-value="180">180</td>
            <td data-value="90">90</td>
            <td data-value="60">60</td>
          </tr>
          <tr>
            <th scope="row">Feb</th>
            <td data-value="460">460</td>
            <td data-value="190">190</td>
            <td data-value="95">95</td>
            <td data-value="70">70</td>
          </tr>
          <tr>
            <th scope="row">Mar</th>
            <td data-value="510">510</td>
            <td data-value="200">200</td>
            <td data-value="110">110</td>
            <td data-value="85">85</td>
          </tr>
          <tr>
            <th scope="row">Apr</th>
            <td data-value="540">540</td>
            <td data-value="205">205</td>
            <td data-value="120">120</td>
            <td data-value="110">110</td>
          </tr>
          <tr>
            <th scope="row">May</th>
            <td data-value="600">600</td>
            <td data-value="215">215</td>
            <td data-value="118">118</td>
            <td data-value="140">140</td>
          </tr>
          <tr>
            <th scope="row">Jun</th>
            <td data-value="650">650</td>
            <td data-value="220">220</td>
            <td data-value="125">125</td>
            <td data-value="170">170</td>
          </tr>
        </tbody>
      </table>

      <helix-area-chart
        for="visits"
        share
      ></helix-area-chart>
    </helix-flex>
  )
}
