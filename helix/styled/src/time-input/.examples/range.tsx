export function Example() {
  return (
    <helix-time-input
      default-value="09:00,17:00"
      hint="A start and an end"
      label="Open"
      mode="range"
      name="open"
      step={30}
    ></helix-time-input>
  )
}
