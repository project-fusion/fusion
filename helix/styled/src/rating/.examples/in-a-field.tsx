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
            hint="One to five, where five is best"
            label="How was it?"
            name="score"
            required
          ></helix-rating>

          <helix-button type="submit">Send</helix-button>
        </helix-flex>
      </form>
    </>
  )
}
