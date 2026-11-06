export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-trend movement="down">
        8%
        <helix-text slot="label">Headcount</helix-text>
      </helix-trend>
      <helix-trend
        good="down"
        movement="down"
      >
        8%
        <helix-text slot="label">Churn</helix-text>
      </helix-trend>
      <helix-trend
        good="up"
        movement="down"
      >
        8%
        <helix-text slot="label">Conversion</helix-text>
      </helix-trend>
    </helix-flex>
  )
}
