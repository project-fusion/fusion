export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-number-input
        default-value="8"
        disabled
        hint="Managed by your admin"
        label="Seats"
      ></helix-number-input>
      <helix-number-input
        disabled
        hint="Managed by your admin"
        label="Extra seats"
      ></helix-number-input>
      <helix-number-input
        default-value="8"
        hint="Set by your plan"
        label="Included seats"
        name="included"
        readonly
      ></helix-number-input>
      <helix-number-input
        default-value="42"
        feedback="Choose a number no greater than 10"
        hint="Between one and ten"
        label="Quantity"
        max={10}
        min={1}
        name="quantity"
      ></helix-number-input>
      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-number-input
            hint="Including yourself"
            label="Guests"
            min={1}
            name="guests"
            required
          ></helix-number-input>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Submit
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
