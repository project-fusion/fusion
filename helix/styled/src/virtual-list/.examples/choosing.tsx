import type { HelixVirtualList } from '@fusion.dev/helix'
import { useState } from 'react'

const teams = ['Design', 'Platform', 'Support', 'Sales']

const people = Array.from({ length: 500 }, (_, index) => ({
  id: `p${index + 1}`,
  name: `Person ${index + 1}`,
  team: teams[index % teams.length],
}))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `
  .personRow {
    align-items: center;
    block-size: 32px;
    cursor: default;
    display: flex;
    justify-content: space-between;
    padding-inline: var(--helix-space-sm);
  }
`

/* The same markup as the HTML example's `<template>`. It is set with
   `innerHTML` because the component clones the template's `content`, and React
   puts JSX children on the `<template>` itself. */
const ROW = `
    <div class="personRow">
      <strong data-field="name"></strong>
      <span data-field="team"></span>
    </div>
  `

export function Example() {
  /* `value` holds the chosen people's `id`s, which `key-field` names. */
  const [chosen, setChosen] = useState('p3,p4')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHEET }} />

      <helix-virtual-list
        items={people}
        key-field="id"
        label="People"
        onChange={(event: Event & { currentTarget: HelixVirtualList }) =>
          setChosen(event.currentTarget.value)
        }
        selection-mode="multiple"
        value={chosen}
      >
        <template dangerouslySetInnerHTML={{ __html: ROW }} />
      </helix-virtual-list>
    </>
  )
}
