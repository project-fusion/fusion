export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-date-input
        default-value="2026-08-18"
        disabled
        hint="Managed by your admin"
        label="Starts"
        name="starts"
      ></helix-date-input>
      <helix-date-input
        default-value="2026-07-01"
        hint="Set when your account was created"
        label="Member since"
        name="member-since"
        readonly
      ></helix-date-input>
      <helix-date-input
        default-value="2026-01-04"
        feedback="Choose a date on or after August 1, 2026"
        hint="Your plan starts on this date"
        label="Plan starts"
        min="2026-08-01"
        name="plan-starts"
      ></helix-date-input>
      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-date-input
            hint="As shown on your passport"
            label="Date of birth"
            name="birth"
            required
          ></helix-date-input>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Save
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
