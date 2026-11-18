export function Example() {
  return (
    <helix-flex
      gap="lg"
      wrap
    >
      <helix-color-picker
        default-value="rgb(51 102 255)"
        format="rgb"
        no-format
      ></helix-color-picker>
      <helix-color-picker
        default-value="#3b82f6"
        no-eyedropper
        no-value
      ></helix-color-picker>
    </helix-flex>
  )
}
