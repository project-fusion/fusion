import './per-series.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="barchartperseries"
      >
        <caption>Deploys per quarter against target</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Gateway</th>
            <th scope="col">Billing</th>
            <th scope="col">Target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="34">34</td>
            <td data-value="21">21</td>
            <td data-value="40">40</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="47">47</td>
            <td data-value="29">29</td>
            <td data-value="45">45</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="41">41</td>
            <td data-value="33">33</td>
            <td data-value="50">50</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="52">52</td>
            <td data-value="38">38</td>
            <td data-value="55">55</td>
          </tr>
        </tbody>
      </table>

      <div className="panel">
        <helix-bar-chart
          for="barchartperseries"
          gridlines="value"
          outlined="Target"
        ></helix-bar-chart>
      </div>
    </>
  )
}
