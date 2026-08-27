export function Example() {
  return (
    <helix-select
      default-value="ap-south-1"
      feedback="That region is not available on your plan"
      hint="Closest to your readers"
      label="Region"
      name="region"
    >
      <helix-icon name="caret-down" slot="indicator"></helix-icon>
      <helix-option value="us-east-1">us-east-1</helix-option>
      <helix-option value="eu-west-2">eu-west-2</helix-option>
      <helix-option value="ap-south-1">ap-south-1</helix-option>
    </helix-select>
  )
}
