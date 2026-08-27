import './preview.css'

export function Example() {
  return (
    <helix-headless-splitter default-position="40">
      <helix-headless-card slot="start">
        <p>Navigator</p>
      </helix-headless-card>
      <helix-headless-card slot="end">
        <p>Editor</p>
      </helix-headless-card>
    </helix-headless-splitter>
  )
}
