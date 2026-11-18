import './states.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="customersloading"
      >
        <caption>Customers</caption>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Segment</th>
            <th scope="col">Age</th>
            <th scope="col">Yearly spend</th>
            <th scope="col">Visits a month</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <table
        data-hidden-visually
        id="customersempty"
      >
        <caption>Customers</caption>
        <thead>
          <tr>
            <th scope="col">Customer</th>
            <th scope="col">Segment</th>
            <th scope="col">Age</th>
            <th scope="col">Yearly spend</th>
            <th scope="col">Visits a month</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Loading</figcaption>
          <helix-spatial-scatter-chart
            for="customersloading"
            group-by="Segment"
            label="Customers"
            loading
          ></helix-spatial-scatter-chart>
        </figure>
        <figure>
          <figcaption>Empty</figcaption>
          <helix-spatial-scatter-chart
            for="customersempty"
            group-by="Segment"
            label="Customers"
          ></helix-spatial-scatter-chart>
        </figure>
      </div>
    </>
  )
}
