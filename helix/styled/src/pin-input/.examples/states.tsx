export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-pin-input
        disabled
        hint="Sign in to verify"
        label="Verification code"
        length={6}
        name="code"
      ></helix-pin-input>
      <helix-pin-input
        default-value="4821"
        hint="Give the code to the support agent"
        label="Support code"
        length={4}
        readonly
      ></helix-pin-input>
      <helix-pin-input
        default-value="12"
        feedback="Enter all six digits"
        hint="The code we sent you"
        label="Email code"
        length={6}
        name="email-code"
      ></helix-pin-input>
      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-pin-input
            hint="Sent to your phone"
            label="Phone code"
            length={6}
            name="phone-code"
            required
          ></helix-pin-input>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Verify
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
