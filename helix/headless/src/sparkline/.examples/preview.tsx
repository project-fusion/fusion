import './preview.css'

export function Example() {
  return (
    <div className="row">
      <helix-headless-sparkline
        label="Sessions over seven days, as bars"
        plot="bar"
        values="1240 1318 1102 1291 1244 1180 1102"
      ></helix-headless-sparkline>
      <helix-headless-sparkline
        label="Sessions over seven days, as a line"
        plot="line"
        values="1240 1318 1102 1291 1244 1180 1102"
      ></helix-headless-sparkline>
      <helix-headless-sparkline
        label="Sessions over seven days, as an area"
        plot="area"
        values="1240 1318 1102 1291 1244 1180 1102"
      ></helix-headless-sparkline>
    </div>
  )
}
