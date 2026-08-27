import './workbench.css'

export function Example() {
  return (
    <helix-splitter default-position="70" orientation="vertical">
      <helix-splitter default-position="45" slot="start">
        <helix-card separation="plain" slot="start">
          <helix-text>Editor</helix-text>
        </helix-card>
        <helix-card separation="plain" slot="end">
          <helix-text>Preview</helix-text>
        </helix-card>
      </helix-splitter>
      <helix-card separation="plain" slot="end">
        <helix-text>Terminal</helix-text>
      </helix-card>
    </helix-splitter>
  )
}
