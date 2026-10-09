import './preview.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="signups"
      >
        <caption>Signups by region and quarter</caption>
        <thead>
          <tr>
            <th scope="col">Region</th>
            <th scope="col">Q1</th>
            <th scope="col">Q2</th>
            <th scope="col">Q3</th>
            <th scope="col">Q4</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">North</th>
            <td>420</td>
            <td>465</td>
            <td>510</td>
            <td>580</td>
          </tr>
          <tr>
            <th scope="row">South</th>
            <td>310</td>
            <td>355</td>
            <td>340</td>
            <td>390</td>
          </tr>
          <tr>
            <th scope="row">East</th>
            <td>520</td>
            <td>560</td>
            <td>615</td>
            <td>690</td>
          </tr>
          <tr>
            <th scope="row">West</th>
            <td>260</td>
            <td>300</td>
            <td>345</td>
            <td>410</td>
          </tr>
          <tr>
            <th scope="row">Central</th>
            <td>180</td>
            <td>210</td>
            <td>205</td>
            <td>240</td>
          </tr>
        </tbody>
      </table>
      <helix-headless-spatial-bar-chart
        for="signups"
        label="Signups by region and quarter"
      ></helix-headless-spatial-bar-chart>
    </>
  )
}
