import { expect, test } from 'bun:test'

import { lapOf } from './chat-composer.js'

/* A conic gradient turned by angle crawled along the middle of a wide
   composer's long sides and raced through its corners. Each side now takes the
   share of the lap its length is of the edge. */
test('each side of the lap takes the share of the time its length is of the edge', () => {
  const corners = lapOf(800, 50).filter((frame) => '--_chat-composer-light-x' in frame)
  expect(corners.map((frame) => frame.offset)).toEqual([0, 800 / 1700, 850 / 1700, 1650 / 1700, 1])
  expect(corners.at(1)).toMatchObject({
    '--_chat-composer-light-x': '800px',
    '--_chat-composer-light-y': '0px',
  })
  expect(lapOf(0, 0)).toEqual([])
})
