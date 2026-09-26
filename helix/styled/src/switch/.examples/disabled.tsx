export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-switch
        default-checked
        disabled
        hint="Managed by your organization"
        label="Email notifications"
        name="a"
      ></helix-switch>

      {/* The disabled fieldset around it disables this field. */}
      <fieldset disabled>
        <helix-switch
          hint="Managed by your organization"
          label="Text message notifications"
          name="b"
        ></helix-switch>
      </fieldset>
    </helix-flex>
  )
}
