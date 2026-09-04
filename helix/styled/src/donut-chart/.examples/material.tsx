import './material.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="donutmaterial"
      >
        <caption>Spend by category</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Spend</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Compute</th>
            <td>412</td>
          </tr>
          <tr>
            <th scope="row">Storage</th>
            <td>228</td>
          </tr>
          <tr>
            <th scope="row">Network</th>
            <td>117</td>
          </tr>
        </tbody>
      </table>

      <div className="panel">
        <figure>
          <figcaption>Opaque</figcaption>
          <helix-donut-chart for="donutmaterial"></helix-donut-chart>
        </figure>
        <figure>
          <figcaption>Glass</figcaption>
          <helix-donut-chart
            for="donutmaterial"
            material="glass"
          ></helix-donut-chart>
        </figure>
      </div>
    </>
  )
}
