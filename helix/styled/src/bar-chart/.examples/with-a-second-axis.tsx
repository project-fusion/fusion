export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="barchartaxes"
      >
        <caption>Bookings and conversion</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Direct</th>
            <th scope="col">Partner</th>
            <th scope="col">Conversion</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="820">820</td>
            <td data-value="410">410</td>
            <td data-value="3.2">3.2%</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="940">940</td>
            <td data-value="520">520</td>
            <td data-value="4.1">4.1%</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="1180">1,180</td>
            <td data-value="470">470</td>
            <td data-value="3.8">3.8%</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="1310">1,310</td>
            <td data-value="640">640</td>
            <td data-value="5.4">5.4%</td>
          </tr>
        </tbody>
      </table>

      <helix-bar-chart
        for="barchartaxes"
        lines="Conversion"
        secondary="Conversion"
      ></helix-bar-chart>
    </>
  )
}
