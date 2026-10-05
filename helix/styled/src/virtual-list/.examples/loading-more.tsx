import { useState } from 'react'

const page = (from: number) =>
  Array.from({ length: 200 }, (_, index) => ({
    name: `report-${from + index + 1}.pdf`,
    size: `${(from + index + 1) * 3} KB`,
    url: `#report-${from + index + 1}`,
  }))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `
  .fileRow {
    align-items: center;
    block-size: 32px;
    display: flex;
    justify-content: space-between;
    padding-inline: var(--helix-space-sm);
  }
`

/* The same markup as the HTML example's `<template>`. It is set with
   `innerHTML` because the component clones the template's `content`, and React
   puts JSX children on the `<template>` itself. */
const ROW = `
    <div class="fileRow">
      <a
        data-field="name"
        data-field-href="url"
        data-link
        href="#files"
      >File</a>
      <span data-field="size"></span>
    </div>
  `

export function Example() {
  const [files, setFiles] = useState(() => page(0))

  /* `helix-load-more` fires when a reader is within one screen of the end.
     Adding the next page to `items` lets it fire again. */
  const loadMore = () => {
    setFiles((before) => (before.length < 1000 ? [...before, ...page(before.length)] : before))
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHEET }} />

      <helix-virtual-list
        items={files}
        label="Files"
        onhelix-load-more={loadMore}
      >
        <template dangerouslySetInnerHTML={{ __html: ROW }} />
      </helix-virtual-list>
    </>
  )
}
