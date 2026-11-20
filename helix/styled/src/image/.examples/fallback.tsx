export function Example() {
  return (
    <helix-grid style={{ '--grid-columns': 'minmax(0, 24rem)' }}>
      <helix-image
        alt="A road winding below highland cliffs at sunset"
        shape="rounded"
        src="/does-not-exist.jpg"
        style={{ '--image-aspect': '16 / 9' }}
      >
        <helix-icon
          name="warning"
          slot="fallback"
        ></helix-icon>
      </helix-image>
    </helix-grid>
  )
}
