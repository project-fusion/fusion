export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="md"
        >
          <helix-rating
            feedback="Choose a rating before sending"
            hint="1 is poor and 5 is excellent"
            label="How was your order?"
            name="score"
            required
          ></helix-rating>

          <helix-button type="submit">Send review</helix-button>
        </helix-flex>
      </form>
    </>
  )
}
