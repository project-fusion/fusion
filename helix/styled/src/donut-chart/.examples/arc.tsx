export function Example() {
  return (
    <>
      <table data-hidden-visually id="donutchartarc">
        <caption>Storage used</caption>
        <thead>
          <tr>
            <th scope="col">Kind</th>
            <th scope="col">Gigabytes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Documents</th>
            <td data-value="180">180</td>
          </tr>
          <tr>
            <th scope="row">Media</th>
            <td data-value="410">410</td>
          </tr>
          <tr>
            <th scope="row">Backups</th>
            <td data-value="260">260</td>
          </tr>
          <tr>
            <th scope="row">Free</th>
            <td data-value="150">150</td>
          </tr>
        </tbody>
      </table>

      <helix-donut-chart for="donutchartarc" sweep="half">
        <helix-stat>
          850
          <span slot="unit">GB</span>
          <span slot="label">of 1 TB used</span>
        </helix-stat>
      </helix-donut-chart>
    </>
  )
}
