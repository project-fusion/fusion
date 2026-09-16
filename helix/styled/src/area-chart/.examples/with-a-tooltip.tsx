export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="areacharttip"
      >
        <caption>Revenue a quarter by region</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Americas</th>
            <th scope="col">EMEA</th>
            <th scope="col">APAC</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="820">$820k</td>
            <td data-value="410">$410k</td>
            <td data-value="160">$160k</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="940">$940k</td>
            <td data-value="520">$520k</td>
            <td data-value="210">$210k</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="1180">$1.18m</td>
            <td data-value="470">$470k</td>
            <td data-value="280">$280k</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="1310">$1.31m</td>
            <td data-value="640">$640k</td>
            <td data-value="390">$390k</td>
          </tr>
        </tbody>
      </table>

      <helix-area-chart
        for="areacharttip"
        total-label="Bookings"
      ></helix-area-chart>
    </helix-flex>
  )
}
