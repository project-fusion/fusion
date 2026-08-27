import './preview.css'

export function Example() {
  return (
    <helix-headless-stat-group>
      <helix-headless-stat>
        1,284
        <span slot="label">Active users</span>
      </helix-headless-stat>
      <helix-headless-stat>
        98.2
        <span slot="label">Uptime</span>
        <span slot="unit">%</span>
      </helix-headless-stat>
      <helix-headless-stat>
        4.7
        <span slot="label">Average rating</span>
      </helix-headless-stat>
    </helix-headless-stat-group>
  )
}
