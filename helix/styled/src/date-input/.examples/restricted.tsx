export function Example() {
  return (
    <helix-date-input
      disable-dates="2026-12-24 2026-12-25 2026-12-26"
      first-day-of-week="1"
      hint="No deliveries from December 24 to 26"
      label="Delivery date"
      locale="en-GB"
      max="2027-01-31"
      min="2026-12-01"
    ></helix-date-input>
  )
}
