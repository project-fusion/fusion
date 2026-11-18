import './wash.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="barchartwash"
      >
        <caption>Deploys per service</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Deploys</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Gateway</th>
            <td data-value="34">34</td>
          </tr>
          <tr>
            <th scope="row">Billing</th>
            <td data-value="18">18</td>
          </tr>
          <tr>
            <th scope="row">Search</th>
            <td data-value="47">47</td>
          </tr>
          <tr>
            <th scope="row">Identity</th>
            <td data-value="9">9</td>
          </tr>
        </tbody>
      </table>

      <div className="panel">
        <figure>
          <figcaption>Flat</figcaption>
          <helix-bar-chart for="barchartwash"></helix-bar-chart>
        </figure>
        <figure>
          <figcaption>Gradient</figcaption>
          <helix-bar-chart
            for="barchartwash"
            wash="gradient"
          ></helix-bar-chart>
        </figure>
      </div>
    </>
  )
}
