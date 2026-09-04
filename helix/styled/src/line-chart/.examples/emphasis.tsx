import './emphasis.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <table
        data-hidden-visually
        id="latency"
      >
        <caption>Latency by week</caption>
        <thead>
          <tr>
            <th>Week</th>
            <th>p50</th>
            <th>p95</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">W1</th>
            <td>112</td>
            <td>340</td>
          </tr>
          <tr>
            <th scope="row">W2</th>
            <td>98</td>
            <td>410</td>
          </tr>
          <tr>
            <th scope="row">W3</th>
            <td>121</td>
            <td>286</td>
          </tr>
          <tr>
            <th scope="row">W4</th>
            <td>104</td>
            <td>318</td>
          </tr>
        </tbody>
      </table>
      <helix-line-chart
        area
        for="latency"
      ></helix-line-chart>
      <helix-line-chart
        area
        emphasis="outlined"
        for="latency"
      ></helix-line-chart>
      <helix-line-chart
        area
        emphasis="solid"
        for="latency"
      ></helix-line-chart>
      <helix-line-chart
        area
        emphasis="subtle"
        for="latency"
      ></helix-line-chart>
    </helix-flex>
  )
}
