export function Example() {
  return (
    <helix-qr-code
      label="Company website"
      style={{
        '--qr-code-background-color': 'oklch(0.98 0.02 260)',
        '--qr-code-color': 'oklch(0.35 0.13 265)',
      }}
      value="https://fusion.dev"
    ></helix-qr-code>
  )
}
