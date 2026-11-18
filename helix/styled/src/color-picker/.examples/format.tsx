export function Example() {
  return (
    <helix-flex
      gap="lg"
      wrap
    >
      <helix-color-picker
        channel-fields
        default-value="oklch(62.8% 0.258 29.2)"
        format="oklch"
      ></helix-color-picker>
      <helix-color-picker
        default-value="hsl(225 100% 60%)"
        format="hsl"
        swatches="#ef4444, rgb(249 115 22), hsl(48 96% 53%), #22c55e, rgb(51 102 255)"
      ></helix-color-picker>
    </helix-flex>
  )
}
