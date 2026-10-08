export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="revenue"
      >
        <caption>Revenue by quarter</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="128000">$128k</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="141000">$141k</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="96000">$96k</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="164000">$164k</td>
          </tr>
        </tbody>
      </table>
      <helix-bar-chart for="revenue"></helix-bar-chart>
      <table
        data-hidden-visually
        id="signups"
      >
        <caption>Signups by channel</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Direct</th>
            <th scope="col">Partner</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td>84</td>
            <td>36</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td>92</td>
            <td>51</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td>70</td>
            <td>44</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td>101</td>
            <td>63</td>
          </tr>
        </tbody>
      </table>
      <helix-bar-chart
        for="signups"
        stacked
      ></helix-bar-chart>
      <table
        data-hidden-visually
        id="net"
      >
        <caption>Net cash by quarter</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Net</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="12000">+$12k</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="-8000">-$8k</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="5000">+$5k</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="-14000">-$14k</td>
          </tr>
        </tbody>
      </table>
      <helix-bar-chart for="net"></helix-bar-chart>
    </helix-flex>
  )
}
