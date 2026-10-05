export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-meter
        max={32}
        show-value
        value={18}
      >
        <span slot="label">Disk used</span>
      </helix-meter>
      <helix-meter
        max={32}
        shape="ring"
        show-value
        value={18}
      >
        <span slot="label">Disk used</span>
      </helix-meter>
    </helix-flex>
  )
}
