export function Example() {
  return (
    <>
      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="md"
        >
          <helix-rating
            default-value="4"
            disabled
            hint="Reviews close 30 days after delivery"
            label="Your last order"
          ></helix-rating>

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
