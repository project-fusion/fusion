export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="runs"
      >
        <caption>Runs per day, this week</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Runs</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Mon</th>
            <td data-value="59800">59,800</td>
          </tr>
          <tr>
            <th scope="row">Tue</th>
            <td
              data-tone="primary"
              data-value="64200"
            >
              64,200
            </td>
          </tr>
          <tr>
            <th scope="row">Wed</th>
            <td data-value="61900">61,900</td>
          </tr>
          <tr>
            <th scope="row">Thu</th>
            <td data-value="63400">63,400</td>
          </tr>
          <tr>
            <th scope="row">Fri</th>
            <td data-value="60700">60,700</td>
          </tr>
          <tr>
            <th scope="row">Sat</th>
            <td data-value="18300">18,300</td>
          </tr>
          <tr>
            <th scope="row">Sun</th>
            <td data-value="12600">12,600</td>
          </tr>
        </tbody>
      </table>
      <helix-spatial-bar-chart
        emphasis="muted"
        for="runs"
        grow
        label="Runs per day, this week"
        layout="row"
      ></helix-spatial-bar-chart>
    </>
  )
}
