import './preview.css'

export function Example() {
  return (
    <helix-headless-card aria-labelledby="card-title">
      <h3 id="card-title" slot="header">
        Card Title
      </h3>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
      labore.
      <helix-headless-button slot="footer">Action</helix-headless-button>
    </helix-headless-card>
  )
}
