export function Example() {
  return (
    <helix-number-input
      default-value="42"
      feedback="Choose a number no greater than 10"
      hint="Between one and ten"
      label="Quantity"
      max={10}
      min={1}
      name="quantity"
    ></helix-number-input>
  )
}
