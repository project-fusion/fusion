import './emphasis.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="sources"
      >
        <caption>Visits by source</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            <th scope="col">Direct</th>
            <th scope="col">Search</th>
            <th scope="col">Referral</th>
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
        </tbody>
      </table>
      <figure>
        <figcaption>Solid</figcaption>
        <helix-legend
          emphasis="solid"
          for="sources"
        ></helix-legend>
      </figure>
      <figure>
        <figcaption>Subtle</figcaption>
        <helix-legend
          emphasis="subtle"
          for="sources"
        ></helix-legend>
      </figure>
      <figure>
        <figcaption>Outlined</figcaption>
        <helix-legend
          emphasis="outlined"
          for="sources"
        ></helix-legend>
      </figure>
      <figure>
        <figcaption>Forecast outlined, Renewals subtle</figcaption>
        <table
          data-hidden-visually
          id="revenue"
        >
          <caption>Revenue by quarter</caption>
          <thead>
            <tr>
              <th>Quarter</th>
              <th>Booked</th>
              <th>Renewals</th>
              <th>Forecast</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Q1</th>
              <td>420</td>
              <td>310</td>
              <td>180</td>
            </tr>
            <tr>
              <th scope="row">Q2</th>
              <td>488</td>
              <td>352</td>
              <td>240</td>
            </tr>
            <tr>
              <th scope="row">Q3</th>
              <td>531</td>
              <td>390</td>
              <td>296</td>
            </tr>
          </tbody>
        </table>
        <helix-bar-chart
          for="revenue"
          outlined="Forecast"
          subtle="Renewals"
        ></helix-bar-chart>
        <helix-legend
          for="revenue"
          outlined="Forecast"
          subtle="Renewals"
        ></helix-legend>
      </figure>
    </helix-flex>
  )
}
