export function Example() {
  return (
    <helix-flex direction="column" gap="lg">
      <helix-meter
        high={80}
        label="Quota"
        low={50}
        optimum={0}
        show-value
        value={100}
      ></helix-meter>
      <helix-meter
        high={80}
        label="Quota"
        low={50}
        optimum={0}
        show-value
        value={128}
      ></helix-meter>
    </helix-flex>
  )
}
