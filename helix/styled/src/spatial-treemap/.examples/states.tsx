import './states.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="servicesloading"
      >
        <caption>Requests and response time by service</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Team</th>
            <th scope="col">Requests a minute</th>
            <th scope="col">p95 response (ms)</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <table
        data-hidden-visually
        id="servicesempty"
      >
        <caption>Requests and response time by service</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Team</th>
            <th scope="col">Requests a minute</th>
            <th scope="col">p95 response (ms)</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Loading</figcaption>
          <helix-spatial-treemap
            for="servicesloading"
            group-by="Team"
            label="Requests and response time by service"
            loading
          ></helix-spatial-treemap>
        </figure>
        <figure>
          <figcaption>Empty</figcaption>
          <helix-spatial-treemap
            for="servicesempty"
            group-by="Team"
            label="Requests and response time by service"
          ></helix-spatial-treemap>
        </figure>
      </div>
    </>
  )
}
