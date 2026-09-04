export function Example() {
  return (
    <helix-flex
      gap="lg"
      wrap
    >
      <table
        data-hidden-visually
        id="mix"
      >
        <caption>Spend by category</caption>
        <thead>
          <tr>
            <th>Category</th>
            <th>Spend</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Compute</th>
            <td>412</td>
          </tr>
          <tr>
            <th scope="row">Storage</th>
            <td>228</td>
          </tr>
          <tr>
            <th scope="row">Network</th>
            <td>117</td>
          </tr>
        </tbody>
      </table>
      <helix-donut-chart for="mix"></helix-donut-chart>
      <helix-donut-chart
        emphasis="outlined"
        for="mix"
      ></helix-donut-chart>
      <helix-donut-chart
        emphasis="subtle"
        for="mix"
      ></helix-donut-chart>
    </helix-flex>
  )
}
