export function Example() {
  return (
    <helix-qr-code
      correction="H"
      label="Company website"
      value="https://fusion.dev"
    >
      <helix-icon
        name="fusion"
        slot="logo"
      ></helix-icon>
    </helix-qr-code>
  )
}
