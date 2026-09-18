export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
    >
      <helix-qr-code
        correction="L"
        value="https://fusion.dev/helix"
      ></helix-qr-code>
      <helix-qr-code
        correction="H"
        value="https://fusion.dev/helix"
      ></helix-qr-code>
    </helix-flex>
  )
}
