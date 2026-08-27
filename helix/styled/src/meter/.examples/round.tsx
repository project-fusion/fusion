export function Example() {
  return (
    <helix-flex align="center" gap="lg">
      <helix-meter
        high={80}
        label="Disk"
        low={50}
        optimum={0}
        shape="arc"
        show-value
        value={72}
      ></helix-meter>
      <helix-meter
        high={80}
        label="Memory"
        low={50}
        optimum={0}
        shape="ring"
        show-value
        value={34}
      ></helix-meter>
      <helix-meter label="Signal" shape="arc" show-value value={88}></helix-meter>
    </helix-flex>
  )
}
