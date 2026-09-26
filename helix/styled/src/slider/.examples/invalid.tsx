export function Example() {
  return (
    <helix-slider
      default-value="95"
      feedback="Set a limit of 80 or lower to avoid throttling"
      hint="Requests per second"
      label="Rate limit"
      max={100}
      name="rate"
      show-value
    ></helix-slider>
  )
}
