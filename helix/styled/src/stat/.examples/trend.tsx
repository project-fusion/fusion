export function Example() {
  return (
    <helix-stat-group divided>
      <helix-stat>
        1,284
        <span slot="label">Active users</span>
        <helix-trend
          good="up"
          movement="up"
          slot="trend"
        >
          12%
          <span slot="label">this month</span>
        </helix-trend>
      </helix-stat>
      <helix-stat>
        212
        <span slot="label">Response time</span>
        <span slot="unit">ms</span>
        <helix-trend
          good="down"
          movement="up"
          slot="trend"
        >
          18ms
          <span slot="label">this week</span>
        </helix-trend>
      </helix-stat>
    </helix-stat-group>
  )
}
