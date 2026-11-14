export function Example() {
  return (
    <helix-flex
      column-gap="xl"
      row-gap="sm"
      wrap
    >
      <helix-trend
        good="up"
        movement="up"
      >
        12.4%
        <helix-text slot="label">Revenue</helix-text>
      </helix-trend>
      <helix-trend
        good="down"
        movement="down"
      >
        0.4pt
        <helix-text slot="label">Churn</helix-text>
      </helix-trend>
      <helix-trend
        good="up"
        movement="down"
      >
        0.6pt
        <helix-text slot="label">Conversion</helix-text>
      </helix-trend>
      <helix-trend
        good="down"
        movement="up"
      >
        40ms
        <helix-text slot="label">Response time</helix-text>
      </helix-trend>
      <helix-trend movement="neutral">
        0<helix-text slot="label">Open incidents</helix-text>
      </helix-trend>
    </helix-flex>
  )
}
