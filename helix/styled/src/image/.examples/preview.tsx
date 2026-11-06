export function Example() {
  return (
    <helix-grid style={{ '--grid-columns': 'minmax(0, 24rem)' }}>
      <helix-image
        alt="A road winding below highland cliffs at sunset"
        shape="rounded"
        src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800"
        style={{ '--image-aspect': '16 / 9' }}
      ></helix-image>
    </helix-grid>
  )
}
