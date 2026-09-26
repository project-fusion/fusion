import './preview.css'

export function Example() {
  return (
    <helix-headless-card aria-labelledby="card-title">
      <h3
        id="card-title"
        slot="header"
      >
        Storage
      </h3>
      You have used 8 GB of the 10 GB in your plan. Delete old files or upgrade to add space.
      <helix-headless-button slot="footer">Manage storage</helix-headless-button>
    </helix-headless-card>
  )
}
