export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <table
        data-hidden-visually
        id="traffic"
      >
        <caption>Visits by source</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>Direct</th>
            <th>Search</th>
            <th>Referral</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">W1</th>
            <td>1204</td>
            <td>812</td>
            <td>240</td>
          </tr>
          <tr>
            <th scope="row">W2</th>
            <td>1388</td>
            <td>964</td>
            <td>221</td>
          </tr>
          <tr>
            <th scope="row">W3</th>
            <td>1502</td>
            <td>1030</td>
            <td>287</td>
          </tr>
        </tbody>
      </table>
      <helix-legend for="traffic"></helix-legend>
    </helix-flex>
  )
}
