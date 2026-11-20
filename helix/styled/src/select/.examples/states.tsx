import type { HelixSelect } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

export function Example() {
  const choice = useRef<HelixSelect>(null)

  useEffect(() => {
    const select = choice.current
    /* On a phone the ref has no `updateComplete`, and the field is not focused. */
    void select?.updateComplete?.then(() => select.focus())
  }, [])

  return (
    <helix-flex
      direction="column"
      gap="lg"
    >
      <helix-select
        default-value="two"
        label="Language"
        name="choice"
        ref={choice}
      >
        <helix-option value="one">English</helix-option>
        <helix-option value="two">Spanish</helix-option>
        <helix-option value="three">French</helix-option>
      </helix-select>

      <helix-select
        default-value="two"
        disabled
        hint="Managed by your admin"
        label="Plan"
        name="a"
      >
        <helix-option value="one">Free</helix-option>
        <helix-option value="two">Pro</helix-option>
      </helix-select>

      {/* The fieldset around this select disables it. */}
      <fieldset disabled>
        <helix-select
          default-value="one"
          hint="Managed by your admin"
          label="Billing cycle"
          name="b"
        >
          <helix-option value="one">Monthly</helix-option>
          <helix-option value="two">Yearly</helix-option>
        </helix-select>
      </fieldset>

      <helix-select
        default-value="usd"
        hint="Set when the account was created"
        label="Currency"
        name="currency"
        readonly
      >
        <helix-option value="usd">US dollar</helix-option>
        <helix-option value="eur">Euro</helix-option>
      </helix-select>

      <helix-select
        hint="Teams you belong to"
        label="Team"
        loading
        name="team"
      ></helix-select>

      <helix-select
        default-value="ap-south-1"
        feedback="That region is not available on your plan"
        hint="Choose the region closest to your users"
        label="Region"
        name="region"
      >
        <helix-icon
          name="caret-down"
          slot="indicator"
        ></helix-icon>
        <helix-option value="us-east-1">us-east-1</helix-option>
        <helix-option value="eu-west-2">eu-west-2</helix-option>
        <helix-option value="ap-south-1">ap-south-1</helix-option>
      </helix-select>

      {/* Preview frame: the submit is swallowed. */}
      <form onSubmit={(event) => event.preventDefault()}>
        <helix-flex
          direction="column"
          gap="sm"
        >
          <helix-select
            hint="Choose the region closest to your users"
            label="Backup region"
            name="backup"
            required
          >
            <helix-icon
              name="caret-down"
              slot="indicator"
            ></helix-icon>
            <helix-option value="us-east-1">us-east-1</helix-option>
            <helix-option value="eu-west-2">eu-west-2</helix-option>
          </helix-select>
          <helix-button
            emphasis="solid"
            tone="primary"
            type="submit"
          >
            Create project
          </helix-button>
        </helix-flex>
      </form>
    </helix-flex>
  )
}
