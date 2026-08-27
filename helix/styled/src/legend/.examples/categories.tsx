export function Example() {
  return (
    <helix-flex direction="column" gap="md">
      <table data-hidden-visually id="plans">
        <caption>Accounts by plan</caption>
        <tbody>
          <tr>
            <th scope="row">Free</th>
            <td>1840</td>
          </tr>
          <tr>
            <th scope="row">Team</th>
            <td>612</td>
          </tr>
          <tr>
            <th scope="row">Enterprise</th>
            <td>78</td>
          </tr>
        </tbody>
      </table>
      <helix-legend entries="categories" for="plans"></helix-legend>
    </helix-flex>
  )
}
