import './fallback.css'

export function Example() {
  return (
    <helix-image
      alt="A road winding below highland cliffs at sunset"
      shape="rounded"
      src="/does-not-exist.jpg"
    >
      <helix-icon
        name="warning"
        slot="fallback"
      ></helix-icon>
    </helix-image>
  )
}
