import './preview.css'

export function Example() {
  return (
    <helix-flex
      gap="xl"
      wrap
    >
      <helix-trend
        direction="up"
        good="up"
      >
        12.4%
        <span slot="label">Revenue</span>
      </helix-trend>
      <helix-trend
        direction="down"
        good="down"
      >
        0.4pt
        <span slot="label">Churn</span>
      </helix-trend>
      <helix-trend
        direction="down"
        good="up"
      >
        0.6pt
        <span slot="label">Conversion</span>
      </helix-trend>
      <helix-trend
        direction="up"
        good="down"
      >
        40ms
        <span slot="label">Response time</span>
      </helix-trend>
      <helix-trend direction="neutral">
        0<span slot="label">Open incidents</span>
      </helix-trend>
    </helix-flex>
  )
}
