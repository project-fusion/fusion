import './emphasis.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="commits"
      >
        <caption>Commits</caption>
        <tbody>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-10">10 Aug</time>
            </th>
            <td>6</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-11">11 Aug</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-12">12 Aug</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-13">13 Aug</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-14">14 Aug</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-15">15 Aug</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-16">16 Aug</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-17">17 Aug</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-18">18 Aug</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-19">19 Aug</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-20">20 Aug</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-21">21 Aug</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-22">22 Aug</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-23">23 Aug</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-24">24 Aug</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-25">25 Aug</time>
            </th>
            <td>5</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-26">26 Aug</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-27">27 Aug</time>
            </th>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-28">28 Aug</time>
            </th>
            <td>6</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-29">29 Aug</time>
            </th>
            <td>0</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-30">30 Aug</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-08-31">31 Aug</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-09-01">1 Sep</time>
            </th>
            <td>5</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-09-02">2 Sep</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-09-03">3 Sep</time>
            </th>
            <td>3</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-09-04">4 Sep</time>
            </th>
            <td>2</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-09-05">5 Sep</time>
            </th>
            <td>1</td>
          </tr>
          <tr>
            <th scope="row">
              <time dateTime="2026-09-06">6 Sep</time>
            </th>
            <td>0</td>
          </tr>
        </tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Solid</figcaption>
          <helix-spatial-heatmap
            for="commits"
            label="Commits, last four weeks"
            rows={7}
            thresholds="1 3 5 7 9"
            tones="1 2 3 4 5"
          ></helix-spatial-heatmap>
        </figure>
        <figure>
          <figcaption>Outlined</figcaption>
          <helix-spatial-heatmap
            emphasis="outlined"
            for="commits"
            label="Commits, last four weeks"
            rows={7}
            thresholds="1 3 5 7 9"
            tones="1 2 3 4 5"
          ></helix-spatial-heatmap>
        </figure>
        <figure>
          <figcaption>Subtle</figcaption>
          <helix-spatial-heatmap
            emphasis="subtle"
            for="commits"
            label="Commits, last four weeks"
            rows={7}
            thresholds="1 3 5 7 9"
            tones="1 2 3 4 5"
          ></helix-spatial-heatmap>
        </figure>
      </div>
    </>
  )
}
