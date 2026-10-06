export function Example() {
  return (
    <helix-description-list
      direction="row"
      label="Deployment"
    >
      <helix-description-list-item label="Id">
        dpl_4127
        <helix-copy-button
          emphasis="ghost"
          label="Copy the id"
          slot="actions"
          value="dpl_4127"
        ></helix-copy-button>
      </helix-description-list-item>
      <helix-description-list-item label="Commit">
        8ee57b9a2
        <helix-copy-button
          emphasis="ghost"
          label="Copy the commit"
          slot="actions"
          value="8ee57b9a2"
        ></helix-copy-button>
      </helix-description-list-item>
      <helix-description-list-item label="Region">us-east</helix-description-list-item>
    </helix-description-list>
  )
}
