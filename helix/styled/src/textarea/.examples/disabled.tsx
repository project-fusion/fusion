import './disabled.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-textarea
        default-value="Cannot be edited"
        disabled
        hint="Hint"
        label="Written off"
      ></helix-textarea>

      {/* The same state, arriving from an ancestor fieldset. */}
      <fieldset disabled>
        <helix-textarea
          default-value="Also cannot be edited"
          hint="Hint"
          label="Off from the fieldset"
        ></helix-textarea>
      </fieldset>
    </helix-flex>
  )
}
