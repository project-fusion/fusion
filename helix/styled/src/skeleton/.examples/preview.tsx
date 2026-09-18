import './preview.css'

export function Example() {
  return (
    <helix-flex
      align-items="center"
      gap="md"
    >
      <helix-skeleton
        className="avatar"
        shape="circle"
      ></helix-skeleton>
      <helix-flex
        className="lines"
        direction="column"
        gap="2xs"
      >
        <helix-skeleton
          className="line-name"
          shape="text"
        ></helix-skeleton>
        <helix-skeleton
          className="line-detail"
          shape="text"
        ></helix-skeleton>
      </helix-flex>
    </helix-flex>
  )
}
