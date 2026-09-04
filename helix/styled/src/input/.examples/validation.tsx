export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="md"
        >
          <helix-input
            hint="Six or more, letters and digits"
            label="Handle"
            minlength="6"
            name="handle"
            pattern="[a-zA-Z0-9]+"
            required
          ></helix-input>

          <helix-input
            hint="Up to 140"
            label="Headline"
            maxLength="140"
            name="headline"
          ></helix-input>

          <helix-button type="submit">Save</helix-button>
        </helix-flex>
      </form>
    </>
  )
}
