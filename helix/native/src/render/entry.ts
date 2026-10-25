/** The entry a copy of a repeat over a list draws, and where the copy stands, from 0. */
export interface Entry {
  readonly fields: Readonly<Record<string, unknown>>
  readonly index: number
}

/** A copy's field, `field()`, or its place, `index()`, as a key's words in a chord. */
export const ofCopy = (item: Entry | undefined, attribute: object): unknown =>
  'field' in attribute ? item?.fields[String(attribute.field)] : item?.index
