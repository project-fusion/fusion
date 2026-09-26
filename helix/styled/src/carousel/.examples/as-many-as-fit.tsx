import './as-many-as-fit.css'

export function Example() {
  return (
    <helix-carousel
      label="Label"
      per-view="auto"
    >
      <helix-card separation="outlined">Item One</helix-card>
      <helix-card separation="outlined">Item Two</helix-card>
      <helix-card separation="outlined">Item Three</helix-card>
      <helix-card separation="outlined">Item Four</helix-card>
      <helix-card separation="outlined">Item Five</helix-card>
      <helix-card separation="outlined">Item Six</helix-card>
    </helix-carousel>
  )
}
