export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-meter
        high={28}
        label="Storage"
        low={16}
        max={32}
        optimum={0}
        show-value
        value={18}
        value-text="18 GB of 32 GB"
      ></helix-meter>
      <helix-meter
        formatOptions={{ style: 'unit', unit: 'gigabyte' }}
        high={28}
        label="Storage"
        low={16}
        max={32}
        optimum={0}
        show-value
        value={18}
      ></helix-meter>
    </helix-flex>
  )
}
