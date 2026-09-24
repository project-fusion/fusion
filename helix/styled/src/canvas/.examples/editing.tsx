import { useRef, useState } from 'react'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Card = { name: string; text: string; tone?: 'accent' | 'success'; x: number; y: number }
type Link = {
  from: string
  fromSide?: Side | undefined
  label?: string | undefined
  name: string
  to: string
  toSide?: Side | undefined
}

const CARDS: Card[] = [
  { name: 'post', text: 'Write the post', x: 0, y: 0 },
  { name: 'demo', text: 'Record a demo', tone: 'accent', x: 256, y: 0 },
  { name: 'ship', text: 'Ship it', tone: 'success', x: 128, y: 160 },
]

const LINKS: Link[] = [{ from: 'post', name: 'post-ship', to: 'ship' }]

export function Example() {
  const [cards, setCards] = useState(CARDS)
  const [links, setLinks] = useState(LINKS)
  const [editing, setEditing] = useState<string | undefined>()
  const made = useRef(0)

  // A card holds what the page put in it, so the page edits it: here, its text, in place.
  const save = (name: string, text: string) => {
    const kept = text.trim()
    setCards((before) =>
      before.map((card) => (card.name === name && kept ? { ...card, text: kept } : card)),
    )
    setEditing(undefined)
  }

  return (
    <helix-canvas
      label="Ideas for the launch"
      onhelix-before-reconnect={(event) => {
        // The board would rewrite the element React renders, so state takes the move instead.
        event.preventDefault()
        const { from, fromSide, name, to, toSide } = event.detail
        setLinks((before) =>
          before.map((link) =>
            link.name === name ? { ...link, from, fromSide, to, toSide } : link,
          ),
        )
      }}
      onhelix-before-relabel={(event) => {
        // The same for a connection's label.
        event.preventDefault()
        const { label, name } = event.detail
        setLinks((before) =>
          before.map((link) =>
            link.name === name ? { ...link, label: label || undefined } : link,
          ),
        )
      }}
      onhelix-canvas-edit={(event) => setEditing(event.detail.name)}
      onhelix-connect={(event) => {
        // Asked rather than done: the board never adds to what React renders, so state does.
        const { from, fromSide, to, toSide } = event.detail
        made.current += 1
        const name = `made-${made.current}`
        setLinks((before) => [...before, { from, fromSide, name, to, toSide }])
      }}
      onhelix-remove={(event) => {
        // The same for removal, which names every connection a removed card would strand.
        const nodes = new Set(event.detail.nodes)
        const edges = new Set(event.detail.edges.map((one) => one.name))
        setCards((before) => before.filter((card) => !nodes.has(card.name)))
        setLinks((before) => before.filter((link) => !edges.has(link.name)))
      }}
    >
      {cards.map((card) => (
        <helix-canvas-node
          height={64}
          key={card.name}
          name={card.name}
          tone={card.tone}
          width={160}
          x={card.x}
          y={card.y}
        >
          {editing === card.name ? (
            // While it is being edited, the text is a field.
            <input
              aria-label="Card text"
              defaultValue={card.text}
              onBlur={(event) => save(card.name, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === 'Escape') {
                  event.preventDefault()
                  if (event.key === 'Escape') {
                    event.currentTarget.value = card.text
                  }
                  event.currentTarget.blur()
                }
              }}
              ref={(field) => {
                field?.focus()
                field?.select()
              }}
            />
          ) : (
            <span>{card.text}</span>
          )}
        </helix-canvas-node>
      ))}

      {links.map((link) => (
        <helix-canvas-edge
          from={link.from}
          from-side={link.fromSide}
          key={link.name}
          label={link.label}
          name={link.name}
          to={link.to}
          to-side={link.toSide}
        ></helix-canvas-edge>
      ))}
    </helix-canvas>
  )
}
