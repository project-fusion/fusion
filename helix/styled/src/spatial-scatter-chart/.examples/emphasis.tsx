import './emphasis.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="customers"
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
        <tbody>
          <tr>
            <th scope="row">Avery S</th>
            <td>Students</td>
            <td>21</td>
            <td>494</td>
            <td>10</td>
          </tr>
          <tr>
            <th scope="row">Blake S</th>
            <td>Students</td>
            <td>19</td>
            <td>336</td>
            <td>9</td>
          </tr>
          <tr>
            <th scope="row">Casey S</th>
            <td>Students</td>
            <td>24</td>
            <td>531</td>
            <td>8</td>
          </tr>
          <tr>
            <th scope="row">Avery F</th>
            <td>Families</td>
            <td>46</td>
            <td>2527</td>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">Blake F</th>
            <td>Families</td>
            <td>43</td>
            <td>2155</td>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">Casey F</th>
            <td>Families</td>
            <td>43</td>
            <td>2291</td>
            <td>4</td>
          </tr>
          <tr>
            <th scope="row">Avery R</th>
            <td>Retirees</td>
            <td>70</td>
            <td>1169</td>
            <td>5</td>
          </tr>
          <tr>
            <th scope="row">Blake R</th>
            <td>Retirees</td>
            <td>68</td>
            <td>1456</td>
            <td>6</td>
          </tr>
          <tr>
            <th scope="row">Casey R</th>
            <td>Retirees</td>
            <td>67</td>
            <td>1887</td>
            <td>6</td>
          </tr>
        </tbody>
      </table>

      <div className="values">
        <figure>
          <figcaption>Solid</figcaption>
          <helix-spatial-scatter-chart
            for="customers"
            group-by="Segment"
            label="Customers"
          ></helix-spatial-scatter-chart>
        </figure>
        <figure>
          <figcaption>Outlined</figcaption>
          <helix-spatial-scatter-chart
            emphasis="outlined"
            for="customers"
            group-by="Segment"
            label="Customers"
          ></helix-spatial-scatter-chart>
        </figure>
        <figure>
          <figcaption>Subtle</figcaption>
          <helix-spatial-scatter-chart
            emphasis="subtle"
            for="customers"
            group-by="Segment"
            label="Customers"
          ></helix-spatial-scatter-chart>
        </figure>
      </div>
    </>
  )
}
