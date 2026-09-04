import './disabled.css'

export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-radio-group
        default-value="one"
        disabled
        hint="Hint"
        label="Written off"
        name="a"
      >
        <helix-radio value="one">Option One</helix-radio>
        <helix-radio value="two">Option Two</helix-radio>
      </helix-radio-group>

      {/* The same state, arriving from an ancestor fieldset. */}
      <fieldset disabled>
        <helix-radio-group
          default-value="two"
          hint="Hint"
          label="Off from the fieldset"
          name="b"
        >
          <helix-radio value="one">Option One</helix-radio>
          <helix-radio value="two">Option Two</helix-radio>
        </helix-radio-group>
      </fieldset>
    </helix-flex>
  )
}
