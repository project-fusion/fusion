export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="traffic-termini"
      >
        <caption>Sessions by source</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Direct</th>
            <th scope="col">Search</th>
            <th scope="col">Social</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">W1</th>
            <td>1240</td>
            <td>860</td>
            <td>410</td>
          </tr>
          <tr>
            <th scope="row">W2</th>
            <td>1410</td>
            <td>980</td>
            <td>520</td>
          </tr>
          <tr>
            <th scope="row">W3</th>
            <td>1330</td>
            <td>1120</td>
            <td>440</td>
          </tr>
          <tr>
            <th scope="row">W4</th>
            <td>1720</td>
            <td>1060</td>
            <td>610</td>
          </tr>
          <tr>
            <th scope="row">W5</th>
            <td>1660</td>
            <td>1310</td>
            <td>580</td>
          </tr>
        </tbody>
      </table>

      <helix-line-chart
        for="traffic-termini"
        label="Sessions by source"
        terminus="ring"
      ></helix-line-chart>

      <helix-legend for="traffic-termini"></helix-legend>
    </helix-flex>
  )
}
