export function Example() {
  return (
    <helix-stat-group divided>
      <helix-stat>
        1,284
        <helix-text slot="label">Active users</helix-text>
      </helix-stat>
      <helix-stat>
        98.2
        <helix-text slot="label">Uptime</helix-text>
        <helix-text slot="unit">%</helix-text>
      </helix-stat>
      <helix-stat>
        4.7
        <helix-text slot="label">Average rating</helix-text>
      </helix-stat>
    </helix-stat-group>
  )
}
