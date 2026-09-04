export function Example() {
  return (
    <helix-flex
      align="center"
      gap="lg"
    >
      <helix-qr-code
        shape="square"
        value="https://fusion.dev"
      ></helix-qr-code>
      <helix-qr-code
        shape="rounded"
        value="https://fusion.dev"
      ></helix-qr-code>
      <helix-qr-code
        shape="dots"
        value="https://fusion.dev"
      ></helix-qr-code>
    </helix-flex>
  )
}
