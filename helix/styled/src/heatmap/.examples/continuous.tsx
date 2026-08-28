export function Example() {
  return (
    <helix-heatmap
      className="field"
      for="load"
      label="Average load by hour"
      rows={7}
      thresholds="0 1 2 3 4"
      tones="1 2 3 4 5"
    >
      <table data-hidden-visually id="load">
        <caption>Average load</caption>
        <tbody>
          <tr>
            <th scope="row">Mon 00:00</th>
            <td data-value="0">0</td>
          </tr>
          <tr>
            <th scope="row">Mon 04:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Mon 08:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Mon 12:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Mon 16:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Mon 20:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Mon 24:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Tue 00:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Tue 04:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Tue 08:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Tue 12:00</th>
            <td data-value="0">0</td>
          </tr>
          <tr>
            <th scope="row">Tue 16:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Tue 20:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Tue 24:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Wed 00:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Wed 04:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Wed 08:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Wed 12:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Wed 16:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Wed 20:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Wed 24:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Thu 00:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Thu 04:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Thu 08:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Thu 12:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Thu 16:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Thu 20:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Thu 24:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Fri 00:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Fri 04:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Fri 08:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Fri 12:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Fri 16:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Fri 20:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Fri 24:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Sat 00:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Sat 04:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Sat 08:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Sat 12:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Sat 16:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Sat 20:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Sat 24:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Sun 00:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Sun 04:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Sun 08:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Sun 12:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Sun 16:00</th>
            <td data-value="5">5</td>
          </tr>
          <tr>
            <th scope="row">Sun 20:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Sun 24:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Mon 00:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Mon 04:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Mon 08:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Mon 12:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Mon 16:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Mon 20:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Mon 24:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Tue 00:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Tue 04:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Tue 08:00</th>
            <td data-value="4">4</td>
          </tr>
          <tr>
            <th scope="row">Tue 12:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Tue 16:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Tue 20:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Tue 24:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Wed 00:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Wed 04:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Wed 08:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Wed 12:00</th>
            <td data-value="0">0</td>
          </tr>
          <tr>
            <th scope="row">Wed 16:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Wed 20:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Wed 24:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Thu 00:00</th>
            <td data-value="3">3</td>
          </tr>
          <tr>
            <th scope="row">Thu 04:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Thu 08:00</th>
            <td data-value="0">0</td>
          </tr>
          <tr>
            <th scope="row">Thu 12:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Thu 16:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Thu 20:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Thu 24:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Fri 00:00</th>
            <td data-value="0">0</td>
          </tr>
          <tr>
            <th scope="row">Fri 04:00</th>
            <td data-value="0">0</td>
          </tr>
          <tr>
            <th scope="row">Fri 08:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Fri 12:00</th>
            <td data-value="1">1</td>
          </tr>
          <tr>
            <th scope="row">Fri 16:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Fri 20:00</th>
            <td data-value="2">2</td>
          </tr>
          <tr>
            <th scope="row">Fri 24:00</th>
            <td data-value="1">1</td>
          </tr>
        </tbody>
      </table>

      <span slot="start">Mon</span>
      <span slot="end">Fri</span>
    </helix-heatmap>
  )
}
