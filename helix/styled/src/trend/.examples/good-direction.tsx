export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-trend direction="down">
        8%
        <span slot="label">Headcount</span>
      </helix-trend>
      <helix-trend
        direction="down"
        good="down"
      >
        8%
        <span slot="label">Churn</span>
      </helix-trend>
      <helix-trend
        direction="down"
        good="up"
      >
        8%
        <span slot="label">Conversion</span>
      </helix-trend>
    </helix-flex>
  )
}
