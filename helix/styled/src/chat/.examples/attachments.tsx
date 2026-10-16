import { useState } from 'react'

const PICTURE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96'%3E%3Crect width='96' height='96' fill='%23f2b45c'/%3E%3Ccircle cx='66' cy='30' r='12' fill='%23fff1d0'/%3E%3Cpath d='M0 70 30 44 52 62 70 50 96 72V96H0Z' fill='%232f6b5a'/%3E%3C/svg%3E"

type Attachment = { image: boolean; name: string }

const DRAFT: Attachment[] = [
  { image: true, name: 'harbor.jpg' },
  { image: false, name: 'notes.md' },
]

export function Example() {
  const [attached, setAttached] = useState(DRAFT)

  // Each attachment leaves when its remove button is pressed.
  const detach = (name: string) => {
    setAttached((before) => before.filter((one) => one.name !== name))
  }

  return (
    <helix-chat-composer
      attached={attached.length > 0}
      className="attachments"
      placeholder="Write a message"
      value="Here are the photo and the notes."
    >
      {attached.map((one) =>
        one.image ? (
          <span
            className="thumbnail"
            key={one.name}
            slot="attachments"
          >
            <helix-image
              alt={one.name}
              src={PICTURE}
            />
            <helix-icon-button
              className="remove"
              label={`Remove ${one.name}`}
              onClick={() => detach(one.name)}
              shape="circle"
            >
              <helix-icon name="x" />
            </helix-icon-button>
          </span>
        ) : (
          <helix-tag
            dismissible
            key={one.name}
            onhelix-dismiss={() => detach(one.name)}
            slot="attachments"
          >
            <helix-icon
              name="file-text"
              slot="start"
            />
            {one.name}
          </helix-tag>
        ),
      )}
    </helix-chat-composer>
  )
}
