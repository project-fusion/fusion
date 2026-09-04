import './preview.css'

export function Example() {
  return (
    <div className="row">
      <helix-headless-trend
        direction="up"
        good="up"
      >
        12.4%
        <span slot="label">Revenue</span>
      </helix-headless-trend>
      <helix-headless-trend
        direction="down"
        good="down"
      >
        0.4pt
        <span slot="label">Churn</span>
      </helix-headless-trend>
      <helix-headless-trend
        direction="down"
        good="up"
      >
        0.6pt
        <span slot="label">Conversion</span>
      </helix-headless-trend>
      <helix-headless-trend
        direction="up"
        good="down"
      >
        40ms
        <span slot="label">p99 latency</span>
      </helix-headless-trend>
      <helix-headless-trend direction="neutral">
        0<span slot="label">Open incidents</span>
      </helix-headless-trend>
    </div>
  )
}
