/* The same stylesheet as the HTML example's `<style>` block. It is set with
   `dangerouslySetInnerHTML` because JSX reads the braces in CSS as expressions. */
const SHEET = `
  .statusList {
    --virtual-list-block-size: 6em;
  }
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
          className="statusList"
          label="Files"
          loading
          loading-text="Loading files"
        ></helix-virtual-list>

        <helix-virtual-list
          className="statusList"
          empty-text="No files in the trash"
          label="Trash"
        ></helix-virtual-list>
      </helix-flex>
    </>
  )
}
