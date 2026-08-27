import './preview.css'

export function Example() {
  return (
    <div className="stack">
      <table data-hidden-visually id="revenue">
        <caption>Revenue by quarter</caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Q1</th>
            <td data-value="128000">$128k</td>
          </tr>
          <tr>
            <th scope="row">Q2</th>
            <td data-value="141000">$141k</td>
          </tr>
          <tr>
            <th scope="row">Q3</th>
            <td data-value="96000">$96k</td>
          </tr>
          <tr>
            <th scope="row">Q4</th>
            <td data-value="164000">$164k</td>
          </tr>
        </tbody>
      </table>
      <helix-headless-bar-chart for="revenue"></helix-headless-bar-chart>
    </div>
  )
}
