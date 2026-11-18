export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-flex
        gap="lg"
        wrap
      >
        <helix-date-picker
          default-month="2026-08"
          default-value="2026-08-14"
          disabled
          label="Start date"
        ></helix-date-picker>
        <helix-date-picker
          default-month="2026-08"
          default-value="2026-08-03"
          label="Hire date"
          name="hired"
          readonly
        ></helix-date-picker>
        <helix-date-picker
          default-month="2026-08"
          default-value="2026-08-14"
          feedback="Choose a date after your start date"
          label="Return date"
          name="returns"
        ></helix-date-picker>
      </helix-flex>
      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-date-picker
            default-month="2026-08"
            label="Delivery date"
            name="delivery"
            required
          ></helix-date-picker>
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
