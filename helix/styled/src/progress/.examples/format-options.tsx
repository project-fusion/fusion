export function Example() {
  return (
    <helix-progress
      format-options='{"style":"unit","unit":"megabyte"}'
      label="Uploading"
      max={120}
      show-value
      value={45}
    ></helix-progress>
  )
}
