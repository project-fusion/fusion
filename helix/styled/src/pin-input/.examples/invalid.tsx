export function Example() {
  return (
    <helix-pin-input
      default-value="12"
      feedback="Enter all six digits"
      hint="The code we sent you"
      label="Verification code"
      length={6}
      name="code"
    ></helix-pin-input>
  )
}
