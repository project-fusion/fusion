export function Example() {
  return (
    <helix-time-input
      default-value="08:30"
      feedback="Choose a time at or after 9:00 AM"
      hint="Between nine and five"
      label="Appointment"
      max="17:00"
      min="09:00"
      name="appointment"
    ></helix-time-input>
  )
}
