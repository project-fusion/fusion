/**
 * The paths a preview frame may ask its page to fetch for it, as
 * `Sandbox.Preview`'s `relay` takes them.
 *
 * **Only files the site serves to anyone**: the frame's own bundle and its
 * chunks, the brand faces, and the models the Graph examples draw. An example
 * in the frame is untrusted and can ask too, so nothing a reader's login
 * reaches belongs here: no route, no API, no page.
 */
export const PREVIEW_RELAY = '/sandbox/ /fonts/ /media/models/'
