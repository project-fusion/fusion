export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-pin-input
        label="Four-digit PIN"
        length={4}
      ></helix-pin-input>
      <helix-pin-input
        default-value="A1B2C3"
        label="Recovery code"
        type="text"
      ></helix-pin-input>
    </helix-flex>
  )
}
