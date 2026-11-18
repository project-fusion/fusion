import type { HelixInput } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

export function Example() {
  const email = useRef<HelixInput>(null)

  useEffect(() => {
    const input = email.current
    /* On a phone the ref has no `updateComplete`, and the field is not focused. */
    void input?.updateComplete?.then(() => input.focus())
  }, [])

  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-input
        label="Email"
        placeholder="name@example.com"
        ref={email}
        type="email"
      ></helix-input>

      <helix-input
        default-value="Cannot be edited"
        disabled
        hint="Only admins can edit this field"
        label="Company name"
      ></helix-input>

      {/* A disabled `fieldset` disables the fields inside it. */}
      <fieldset disabled>
        <helix-input
          default-value="Also cannot be edited"
          hint="Only admins can edit this field"
          label="Billing email"
        ></helix-input>
      </fieldset>

      <helix-input
        default-value="fsn-3f9c21"
        hint="Ask an owner to change this"
        label="Workspace ID"
        name="workspace"
        readonly
      ></helix-input>

      <helix-input
        default-value="short"
        feedback="Too short"
        hint="At least 12 characters"
        label="Password"
        type="password"
      ></helix-input>

      {/* The form does not submit in the preview. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-input
            hint="We print this on your invoices"
            label="Full name"
            name="name"
            placeholder="Ada Lovelace"
            required
          ></helix-input>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Submit
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
