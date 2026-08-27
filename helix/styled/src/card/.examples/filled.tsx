export function Example() {
  return (
    <helix-card aria-labelledby="filled-title" separation="filled">
      <h3 id="filled-title" slot="header">
        Filled
      </h3>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
      labore.
      <helix-button emphasis="ghost" slot="footer">
        Action
      </helix-button>
    </helix-card>
  )
}
