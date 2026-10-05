export function Example() {
  return (
    <helix-carousel
      label="Folders"
      mouse-drag
    >
      <helix-card separation="outlined">Reports</helix-card>
      <helix-card separation="outlined">Invoices</helix-card>
      <helix-card separation="outlined">Contracts</helix-card>
      <helix-icon
        name="arrow-left"
        slot="previous-icon"
      ></helix-icon>
      <helix-icon
        name="arrow-right"
        slot="next-icon"
      ></helix-icon>
    </helix-carousel>
  )
}
