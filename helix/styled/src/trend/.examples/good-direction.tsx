export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-trend movement="down">
        8%
        <span slot="label">Headcount</span>
      </helix-trend>
      <helix-trend
        good="down"
        movement="down"
      >
        8%
        <span slot="label">Churn</span>
      </helix-trend>
      <helix-trend
        good="up"
        movement="down"
      >
        8%
        <span slot="label">Conversion</span>
      </helix-trend>
    </helix-flex>
  )
}
