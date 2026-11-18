const tracks = Array.from({ length: 200 }, (_, index) => ({
  length: `${3 + (index % 3)}:${String((index * 17) % 60).padStart(2, '0')}`,
  name: `Track ${index + 1}`,
}))

/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `
  #playlist {
    --virtual-list-block-size: 12em;
  }

  .trackRow {
    align-items: center;
    block-size: max(40px, var(--helix-size-target));
    display: flex;
    justify-content: space-between;
    padding-inline: var(--helix-space-sm);
  }

  .trackCard {
    box-sizing: border-box;
    display: grid;
    gap: var(--helix-space-2xs);
    inline-size: 128px;
    padding: var(--helix-space-2xs);
  }

  .trackCover {
    aspect-ratio: 1;
    background-color: color-mix(in oklab, var(--helix-color-primary) 18%, transparent);
    border-radius: var(--helix-radii-sm);
  }
`

/* The same markup as the HTML examples' `<template>`s. It is set with
   `innerHTML` because the component clones the template's `content`, and React
   puts JSX children on the `<template>` itself. */
const ROW = `
      <div class="trackRow">
        <strong data-field="name"></strong>
        <span data-field="length"></span>
      </div>
    `

const CARD = `
      <div class="trackCard">
        <span class="trackCover"></span>
        <strong data-field="name"></strong>
        <span data-field="length"></span>
      </div>
    `

export function Example() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SHEET }} />

      <helix-flex
        direction="column"
        gap="lg"
      >
        <helix-virtual-list
          estimate={40}
          id="playlist"
          items={tracks}
          label="Playlist"
          text-field="name"
        >
          <template dangerouslySetInnerHTML={{ __html: ROW }} />
        </helix-virtual-list>

        <helix-virtual-list
          estimate={128}
          items={tracks}
          label="Recently played"
          orientation="horizontal"
          text-field="name"
        >
          <template dangerouslySetInnerHTML={{ __html: CARD }} />
        </helix-virtual-list>
      </helix-flex>
    </>
  )
}
