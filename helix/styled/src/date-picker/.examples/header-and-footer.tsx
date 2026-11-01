export function Example() {
  return (
    <helix-date-picker
      default-month="2026-08"
      label="Check-in"
    >
      <helix-text
        scale="label"
        slot="header"
      >
        Check-in after 3 PM
      </helix-text>
      <helix-text
        emphasis="muted"
        scale="caption"
        slot="footer"
      >
        Prices are per night.
      </helix-text>
    </helix-date-picker>
  )
}
