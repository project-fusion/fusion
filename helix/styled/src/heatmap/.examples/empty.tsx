export function Example() {
  return (
    <helix-heatmap
      empty-text="No readings in this range"
      for="none"
      label="Uptime, last 30 days"
    >
      <table
        data-hidden-visually
        id="none"
      >
        <caption>Uptime</caption>
        <tbody />
      </table>
    </helix-heatmap>
  )
}
