export function Example() {
  return (
    <helix-card aria-labelledby="card-title" separation="outlined">
      <h3 id="card-title" slot="header">
        Card Title
      </h3>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
      labore.
      <helix-button emphasis="ghost" slot="footer">
        Action
      </helix-button>
    </helix-card>
  )
}
