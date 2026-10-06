export function Example() {
  return (
    <helix-listbox
      default-value="m"
      label="Size"
      layout="grid"
      name="size"
    >
      <helix-option value="xs">Extra small</helix-option>
      <helix-option value="s">Small</helix-option>
      <helix-option value="m">Medium</helix-option>
      <helix-option value="l">Large</helix-option>
      <helix-option value="xl">Extra large</helix-option>
      <helix-option value="xxl">Double extra large</helix-option>
    </helix-listbox>
  )
}
