export function Example() {
  return (
    <helix-grid style={{ '--grid-columns': 'minmax(0, 20rem)' }}>
      <helix-image
        alt="Product photo"
        style={{ '--image-aspect': '4 / 3' }}
      >
        <helix-skeleton slot="placeholder"></helix-skeleton>
      </helix-image>
    </helix-grid>
  )
}
