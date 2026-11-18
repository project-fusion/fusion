export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="md"
    >
      <helix-date-input
        disable-days="0,6"
        label="Delivery date"
        max="2026-12-31"
        min="2026-08-18"
        name="delivery"
      ></helix-date-input>
      <helix-date-input
        disable-dates="2026-12-24 2026-12-25 2026-12-26"
        first-day-of-week="1"
        hint="No deliveries from December 24 to 26"
        label="Holiday delivery date"
        locale="en-GB"
        max="2027-01-31"
        min="2026-12-01"
      ></helix-date-input>
    </helix-flex>
  )
}
