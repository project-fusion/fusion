import './states.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="signupsloading"
      >
        <caption>Signups by region and quarter</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Q1</th>
            <th scope="col">Q2</th>
            <th scope="col">Q3</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <table
        data-hidden-visually
        id="signupsempty"
      >
        <caption>Signups by region and quarter</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Q1</th>
            <th scope="col">Q2</th>
            <th scope="col">Q3</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Loading</figcaption>
          <helix-spatial-bar-chart
            for="signupsloading"
            label="Signups by region and quarter"
            loading
          ></helix-spatial-bar-chart>
        </figure>
        <figure>
          <figcaption>Empty</figcaption>
          <helix-spatial-bar-chart
            for="signupsempty"
            label="Signups by region and quarter"
          ></helix-spatial-bar-chart>
        </figure>
      </div>
    </>
  )
}
