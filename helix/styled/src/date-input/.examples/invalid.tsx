export function Example() {
  return (
    <helix-date-input
      default-value="2026-01-04"
      feedback="Choose a date on or after August 1, 2026"
      hint="Your plan starts on this date"
      label="Starts"
      min="2026-08-01"
      name="starts"
    ></helix-date-input>
  )
}
