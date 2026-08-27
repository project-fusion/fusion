export function Example() {
  return (
    <helix-number-input
      hint="Arrows move by one, Page keys by ten"
      label="Seats"
      large-step="10"
      max={500}
      min={0}
      step={1}
    ></helix-number-input>
  )
}
