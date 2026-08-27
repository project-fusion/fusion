import './preview.css'

export function Example() {
  return (
    <helix-headless-number-input
      default-value="3"
      label="Guests"
      min={1}
    ></helix-headless-number-input>
  )
}
