export function Example() {
  return (
    <>
      {/* Preview frame: the submit is swallowed. */}
      <form
        action="/tickets"
        encType="multipart/form-data"
        method="post"
        onSubmit={(event) => event.preventDefault()}
      >
        <helix-flex
          direction="column"
          gap="md"
        >
          <helix-input
            label="Summary"
            name="summary"
            required
          ></helix-input>

          <helix-textarea
            label="What happened"
            name="body"
            required
          ></helix-textarea>

          <helix-file-input
            hint="PNG or JPG, up to 10MB"
            label="Screenshot"
            name="screenshot"
          ></helix-file-input>

          <helix-flex gap="sm">
            <helix-button
              emphasis="solid"
              name="intent"
              tone="primary"
              type="submit"
              value="send"
            >
              Send
            </helix-button>

            <helix-button
              formaction="/tickets/draft"
              formenctype="application/x-www-form-urlencoded"
              formnovalidate
              name="intent"
              type="submit"
              value="draft"
            >
              Save draft
            </helix-button>

            <helix-button
              formaction="/tickets/preview"
              formmethod="get"
              formtarget="_blank"
              name="intent"
              type="submit"
              value="preview"
            >
              Preview
            </helix-button>
          </helix-flex>
        </helix-flex>
      </form>
    </>
  )
}
