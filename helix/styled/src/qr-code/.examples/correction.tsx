export function Example() {
  return (
    <helix-flex
      align="center"
      gap="lg"
    >
      <helix-qr-code
        correction="L"
        value="https://helix.fusion.dev"
      ></helix-qr-code>
      <helix-qr-code
        correction="H"
        value="https://helix.fusion.dev"
      ></helix-qr-code>
    </helix-flex>
  )
}
