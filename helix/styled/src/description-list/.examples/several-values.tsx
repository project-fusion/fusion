export function Example() {
  return (
    <helix-description-list
      direction="row"
      label="Paper details"
    >
      <helix-description-list-item label="Title">
        Notes on the Analytical Engine
      </helix-description-list-item>
      <helix-description-list-item
        label="Authors"
        several
      >
        <dd>Ada Lovelace</dd>
        <dd>Luigi Menabrea</dd>
      </helix-description-list-item>
      <helix-description-list-item label="Published">1843</helix-description-list-item>
    </helix-description-list>
  )
}
