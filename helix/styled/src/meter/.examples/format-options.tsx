export function Example() {
  return (
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
  )
}
