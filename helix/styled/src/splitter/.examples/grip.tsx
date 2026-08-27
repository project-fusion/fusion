import './grip.css'

export function Example() {
  return (
    <helix-splitter default-position="40" variant="grip">
      <helix-card separation="plain" slot="start">
        <helix-text>Navigator</helix-text>
      </helix-card>
      <helix-card separation="plain" slot="end">
        <helix-text>Editor</helix-text>
      </helix-card>
    </helix-splitter>
  )
}
