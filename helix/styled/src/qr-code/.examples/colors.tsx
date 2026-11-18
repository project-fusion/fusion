import './colors.css'

export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="lg"
    >
      <helix-qr-code
        className="brand"
        label="Company website"
        value="https://fusion.dev"
      ></helix-qr-code>
      <helix-qr-code
        className="finders"
        shape="rounded"
        value="https://fusion.dev"
      ></helix-qr-code>
    </helix-flex>
  )
}
