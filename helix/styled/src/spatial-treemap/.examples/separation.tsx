import './separation.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="services"
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
        <tbody>
          <tr>
            <th scope="row">Gateway</th>
            <td>Platform</td>
            <td>4200</td>
            <td>85</td>
          </tr>
          <tr>
            <th scope="row">Auth</th>
            <td>Platform</td>
            <td>2600</td>
            <td>40</td>
          </tr>
          <tr>
            <th scope="row">Search</th>
            <td>Platform</td>
            <td>1800</td>
            <td>210</td>
          </tr>
          <tr>
            <th scope="row">Checkout</th>
            <td>Payments</td>
            <td>1500</td>
            <td>320</td>
          </tr>
          <tr>
            <th scope="row">Billing</th>
            <td>Payments</td>
            <td>900</td>
            <td>180</td>
          </tr>
          <tr>
            <th scope="row">Ledger</th>
            <td>Payments</td>
            <td>600</td>
            <td>140</td>
          </tr>
        </tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Plain</figcaption>
          <helix-spatial-treemap
            for="services"
            group-by="Team"
            label="Requests and response time by service"
          ></helix-spatial-treemap>
        </figure>
        <figure>
          <figcaption>Filled</figcaption>
          <helix-spatial-treemap
            for="services"
            group-by="Team"
            label="Requests and response time by service"
            separation="filled"
          ></helix-spatial-treemap>
        </figure>
      </div>
    </>
  )
}
