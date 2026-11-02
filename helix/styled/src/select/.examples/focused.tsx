import type { HelixSelect } from '@fusion.dev/helix'
import { useEffect, useRef } from 'react'

export function Example() {
  const choice = useRef<HelixSelect>(null)

  useEffect(() => {
    const select = choice.current
    select?.updateComplete.then(() => select.focus())
  }, [])

  return (
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
  )
}
