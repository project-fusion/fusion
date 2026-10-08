export function Example() {
  return (
    <helix-heatmap
      for="commits"
      label="Commits, four weeks"
      rows={7}
      selection-mode="multiple"
      selection-shape="rectangle"
      thresholds="1 3 5 7 9"
      tones="1 2 3 4 5"
      value="2026-06-09, 2026-06-10, 2026-06-11, 2026-06-16, 2026-06-17, 2026-06-18"
    >
      <table
        data-hidden-visually
        id="commits"
      >
        <caption>Commits</caption>
        <tbody>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-01">1 Jun</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-02">2 Jun</time>
            </th>
            <td>8</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-03">3 Jun</time>
            </th>
            <td>5</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-04">4 Jun</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-05">5 Jun</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-06">6 Jun</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-07">7 Jun</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-08">8 Jun</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-09">9 Jun</time>
            </th>
            <td>7</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-10">10 Jun</time>
            </th>
            <td>9</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-11">11 Jun</time>
            </th>
            <td>6</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-12">12 Jun</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-13">13 Jun</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-14">14 Jun</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-15">15 Jun</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-16">16 Jun</time>
            </th>
            <td>6</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-17">17 Jun</time>
            </th>
            <td>8</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-18">18 Jun</time>
            </th>
            <td>7</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-19">19 Jun</time>
            </th>
            <td>5</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-20">20 Jun</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-21">21 Jun</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-22">22 Jun</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-23">23 Jun</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-24">24 Jun</time>
            </th>
            <td>9</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-25">25 Jun</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-26">26 Jun</time>
            </th>
            <td>6</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-27">27 Jun</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-06-28">28 Jun</time>
            </th>
            <td>0</td>
          </tr>
        </tbody>
      </table>

      <span slot="start">1 Jun</span>
      <span slot="end">28 Jun</span>
    </helix-heatmap>
  )
}
