import './media-at-the-end.css'

export function Example() {
  return (
    <helix-card
      aria-labelledby="sessions-title"
      className="metric"
      media-placement="end"
      separation="outlined"
    >
      <helix-text
        as="h3"
        id="sessions-title"
        scale="title"
        slot="header"
      >
        Sessions
      </helix-text>
      <helix-text
        as="p"
        scale="display"
      >
        12,481
      </helix-text>
      <helix-sparkline
        label="Sessions over the last seven days"
        plot="area"
        slot="media"
        values="1240 1318 1102 1291 1244 1180 1102"
      ></helix-sparkline>
    </helix-card>
  )
}
