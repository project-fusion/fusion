export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-stat direction="column-reverse">
        1,284
        <span slot="label">Active users</span>
      </helix-stat>
      <helix-stat direction="row">
        98.2
        <span slot="label">Uptime</span>
        <span slot="unit">%</span>
      </helix-stat>
      <helix-stat direction="row-reverse">
        4.7
        <span slot="label">Rating</span>
      </helix-stat>
    </helix-flex>
  )
}
