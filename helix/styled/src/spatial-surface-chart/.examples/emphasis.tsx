import './emphasis.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="load"
      >
        <caption>Load over a weekend</caption>
        <thead>
          <tr>
            <th scope="col">Slot</th>
            <th scope="col">Hour</th>
            <th scope="col">Day</th>
            <th scope="col">Requests a minute</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Fri 00:00</th>
            <td>0</td>
            <td>5</td>
            <td>90</td>
          </tr>
          <tr>
            <th scope="row">Fri 04:00</th>
            <td>4</td>
            <td>5</td>
            <td>137</td>
          </tr>
          <tr>
            <th scope="row">Fri 08:00</th>
            <td>8</td>
            <td>5</td>
            <td>943</td>
          </tr>
          <tr>
            <th scope="row">Fri 12:00</th>
            <td>12</td>
            <td>5</td>
            <td>1155</td>
          </tr>
          <tr>
            <th scope="row">Fri 16:00</th>
            <td>16</td>
            <td>5</td>
            <td>1245</td>
          </tr>
          <tr>
            <th scope="row">Fri 20:00</th>
            <td>20</td>
            <td>5</td>
            <td>416</td>
          </tr>
          <tr>
            <th scope="row">Sat 00:00</th>
            <td>0</td>
            <td>6</td>
            <td>99</td>
          </tr>
          <tr>
            <th scope="row">Sat 04:00</th>
            <td>4</td>
            <td>6</td>
            <td>131</td>
          </tr>
          <tr>
            <th scope="row">Sat 08:00</th>
            <td>8</td>
            <td>6</td>
            <td>386</td>
          </tr>
          <tr>
            <th scope="row">Sat 12:00</th>
            <td>12</td>
            <td>6</td>
            <td>435</td>
          </tr>
          <tr>
            <th scope="row">Sat 16:00</th>
            <td>16</td>
            <td>6</td>
            <td>496</td>
          </tr>
          <tr>
            <th scope="row">Sat 20:00</th>
            <td>20</td>
            <td>6</td>
            <td>413</td>
          </tr>
          <tr>
            <th scope="row">Sun 00:00</th>
            <td>0</td>
            <td>7</td>
            <td>144</td>
          </tr>
          <tr>
            <th scope="row">Sun 04:00</th>
            <td>4</td>
            <td>7</td>
            <td>136</td>
          </tr>
          <tr>
            <th scope="row">Sun 08:00</th>
            <td>8</td>
            <td>7</td>
            <td>356</td>
          </tr>
          <tr>
            <th scope="row">Sun 12:00</th>
            <td>12</td>
            <td>7</td>
            <td>469</td>
          </tr>
          <tr>
            <th scope="row">Sun 16:00</th>
            <td>16</td>
            <td>7</td>
            <td>458</td>
          </tr>
          <tr>
            <th scope="row">Sun 20:00</th>
            <td>20</td>
            <td>7</td>
            <td>397</td>
          </tr>
        </tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Solid</figcaption>
          <helix-spatial-surface-chart
            for="load"
            label="Load over a weekend"
          ></helix-spatial-surface-chart>
        </figure>
        <figure>
          <figcaption>Outlined</figcaption>
          <helix-spatial-surface-chart
            emphasis="outlined"
            for="load"
            label="Load over a weekend"
          ></helix-spatial-surface-chart>
        </figure>
        <figure>
          <figcaption>Subtle</figcaption>
          <helix-spatial-surface-chart
            emphasis="subtle"
            for="load"
            label="Load over a weekend"
          ></helix-spatial-surface-chart>
        </figure>
      </div>
    </>
  )
}
