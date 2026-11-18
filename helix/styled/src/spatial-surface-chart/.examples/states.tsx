import './states.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="loadloading"
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
        <tbody></tbody>
      </table>

      <table
        data-hidden-visually
        id="loadempty"
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
        <tbody></tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Loading</figcaption>
          <helix-spatial-surface-chart
            for="loadloading"
            label="Load over a weekend"
            loading
          ></helix-spatial-surface-chart>
        </figure>
        <figure>
          <figcaption>Empty</figcaption>
          <helix-spatial-surface-chart
            for="loadempty"
            label="Load over a weekend"
          ></helix-spatial-surface-chart>
        </figure>
      </div>
    </>
  )
}
