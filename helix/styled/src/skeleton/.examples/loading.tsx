export function Example() {
  return (
    <helix-flex
      direction="column"
      gap="sm"
    >
      <helix-skeleton loading>
        <helix-button emphasis="solid">Save the profile</helix-button>
      </helix-skeleton>
      <helix-skeleton>
        <helix-button emphasis="solid">Save the profile</helix-button>
      </helix-skeleton>
    </helix-flex>
  )
}
