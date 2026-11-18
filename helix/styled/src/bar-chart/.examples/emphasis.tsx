import './emphasis.css'

export function Example() {
  return (
    <>
      <table
        data-hidden-visually
        id="deploys"
      >
        <caption>Deploys per quarter</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Gateway</th>
            <th scope="col">Billing</th>
            <th scope="col">Search</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="34">34</td>
            <td data-value="21">21</td>
            <td data-value="28">28</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="47">47</td>
            <td data-value="29">29</td>
            <td data-value="35">35</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="41">41</td>
            <td data-value="33">33</td>
            <td data-value="44">44</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="52">52</td>
            <td data-value="38">38</td>
            <td data-value="49">49</td>
          </tr>
        </tbody>
      </table>

      <table
        data-hidden-visually
        id="target"
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
        <figure>
          <figcaption>Solid</figcaption>
          <helix-bar-chart
            emphasis="solid"
            for="deploys"
          ></helix-bar-chart>
        </figure>
        <figure>
          <figcaption>Subtle</figcaption>
          <helix-bar-chart
            emphasis="subtle"
            for="deploys"
          ></helix-bar-chart>
        </figure>
        <figure>
          <figcaption>Outlined</figcaption>
          <helix-bar-chart
            emphasis="outlined"
            for="deploys"
          ></helix-bar-chart>
        </figure>
        <figure>
          <figcaption>Target outlined</figcaption>
          <helix-bar-chart
            for="target"
            outlined="Target"
          ></helix-bar-chart>
        </figure>
      </div>
    </>
  )
}
