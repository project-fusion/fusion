export function Example() {
  return (
    <helix-date-picker
      default-month="2026-08"
      label="Check-in"
    >
      <helix-text
        slot="header"
        variant="label"
      >
        Check-in after 3 PM
      </helix-text>
      <helix-text
        emphasis="muted"
        slot="footer"
        variant="caption"
      >
        Prices are per night.
      </helix-text>
    </helix-date-picker>
  )
}
