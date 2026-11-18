export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <span className="label">Solid</span>
      <helix-heatmap
        emphasis="solid"
        for="emphasissolid"
        label="Commits, solid cells"
        rows={1}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table
          data-hidden-visually
          id="emphasissolid"
        >
          <caption>Commits</caption>
          <tbody>
            <tr>
              <th scope="row">Day 1</th>
              <td data-value="0">0</td>
            </tr>
            <tr>
              <th scope="row">Day 2</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 3</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 4</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 5</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 6</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 7</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 8</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 9</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 10</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 11</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 12</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 13</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 14</th>
              <td data-value="10">10</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>
      <span className="label">Subtle</span>
      <helix-heatmap
        emphasis="subtle"
        for="emphasissubtle"
        label="Commits, subtle cells"
        rows={1}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table
          data-hidden-visually
          id="emphasissubtle"
        >
          <caption>Commits</caption>
          <tbody>
            <tr>
              <th scope="row">Day 1</th>
              <td data-value="0">0</td>
            </tr>
            <tr>
              <th scope="row">Day 2</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 3</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 4</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 5</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 6</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 7</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 8</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 9</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 10</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 11</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 12</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 13</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 14</th>
              <td data-value="10">10</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>
      <span className="label">Outlined</span>
      <helix-heatmap
        emphasis="outlined"
        for="emphasisoutlined"
        label="Commits, outlined cells"
        rows={1}
        thresholds="1 3 5 7 9"
        tones="1 2 3 4 5"
      >
        <table
          data-hidden-visually
          id="emphasisoutlined"
        >
          <caption>Commits</caption>
          <tbody>
            <tr>
              <th scope="row">Day 1</th>
              <td data-value="0">0</td>
            </tr>
            <tr>
              <th scope="row">Day 2</th>
              <td data-value="2">2</td>
            </tr>
            <tr>
              <th scope="row">Day 3</th>
              <td data-value="4">4</td>
            </tr>
            <tr>
              <th scope="row">Day 4</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 5</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 6</th>
              <td data-value="10">10</td>
            </tr>
            <tr>
              <th scope="row">Day 7</th>
              <td data-value="3">3</td>
            </tr>
            <tr>
              <th scope="row">Day 8</th>
              <td data-value="5">5</td>
            </tr>
            <tr>
              <th scope="row">Day 9</th>
              <td data-value="7">7</td>
            </tr>
            <tr>
              <th scope="row">Day 10</th>
              <td data-value="9">9</td>
            </tr>
            <tr>
              <th scope="row">Day 11</th>
              <td data-value="1">1</td>
            </tr>
            <tr>
              <th scope="row">Day 12</th>
              <td data-value="6">6</td>
            </tr>
            <tr>
              <th scope="row">Day 13</th>
              <td data-value="8">8</td>
            </tr>
            <tr>
              <th scope="row">Day 14</th>
              <td data-value="10">10</td>
            </tr>
          </tbody>
        </table>
      </helix-heatmap>
    </helix-flex>
  )
}
