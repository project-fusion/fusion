export function Example() {
  return (
    <helix-stat-group divided>
      <helix-stat>
        1,284
        <span slot="label">Active users</span>
      </helix-stat>
      <helix-stat>
        98.2
        <span slot="label">Uptime</span>
        <span slot="unit">%</span>
      </helix-stat>
      <helix-stat>
        4.7
        <span slot="label">Average rating</span>
      </helix-stat>
    </helix-stat-group>
  )
}
