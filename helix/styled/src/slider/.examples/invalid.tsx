export function Example() {
  return (
    <helix-slider
      default-value="95"
      feedback="Anything above eighty risks throttling"
      hint="Requests per second"
      label="Rate limit"
      max={100}
      name="rate"
      show-value
    ></helix-slider>
  )
}
