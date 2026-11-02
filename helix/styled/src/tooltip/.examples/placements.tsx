export function Example() {
  return (
    <helix-flex gap="lg">
      <helix-tooltip
        content="Above"
        placement="top"
      >
        <helix-button>Top</helix-button>
      </helix-tooltip>
      <helix-tooltip
        content="Below"
        placement="bottom"
      >
        <helix-button>Bottom</helix-button>
      </helix-tooltip>
      <helix-tooltip
        content="To the left"
        placement="left"
      >
        <helix-button>Left</helix-button>
      </helix-tooltip>
      <helix-tooltip
        content="To the right"
        placement="right"
      >
        <helix-button>Right</helix-button>
      </helix-tooltip>
    </helix-flex>
  )
}
