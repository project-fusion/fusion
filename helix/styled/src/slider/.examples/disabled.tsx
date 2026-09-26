export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-slider
        default-value="40"
        disabled
        hint="Managed by your admin"
        label="Volume"
        show-value
      ></helix-slider>

      {/* The fieldset around this slider disables it. */}
      <fieldset disabled>
        <helix-slider
          default-value="70"
          hint="Managed by your admin"
          label="Brightness"
          show-value
        ></helix-slider>
      </fieldset>
    </helix-flex>
  )
}
