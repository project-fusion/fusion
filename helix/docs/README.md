# @fusion.dev/helix-docs

The Helix documentation as content: the pages, the registry that names them,
and the renderer for the component reference.

```sh
npm install @fusion.dev/helix-docs
```

```js
import { docSources, findPage, navigation, reference } from '@fusion.dev/helix-docs'
```

- `pages` is every page, each with its `slug`, `title`, `section`, and
  `description`. `findPage(slug)` returns one page.
- `navigation()` returns the sidebar: each section in order, the pages under it
  in the order a sidebar renders them, and each page's children.
- `sections` is the sections in order, and `findSection(title)` returns one.
- `docSources` holds each page's MDX, keyed by slug.
- `contentPath(page)` takes a page from `pages` and returns the path of its MDX
  in the package, such as `content/theming.mdx`. Import the file as
  `@fusion.dev/helix-docs/content/theming.mdx`.
- `reference(manifest, options)` renders a `custom-elements.json` as the
  markdown component reference. `referenceFamilies(manifest)` returns each
  family and its parts in the order the reference prints them.

The component catalog ships in each tier as `api.json` and `examples.json`,
such as `@fusion.dev/helix/api.json`: every family with its elements, imports,
and examples. An add-on package ships them too, listing the elements it adds
to a family: `@fusion.dev/helix-sandbox/api.json` lists its editor under the
Sandbox family.

Published as a package rather than served only from a site so that the
documentation carries the version of the library it documents. A docs package at
version x describes Helix at version x, which is why versioning here is per
domain rather than per repository.

Rendered at [fusion.dev/helix](https://fusion.dev/helix). Install this if you are
building your own surface over the same content.

MIT
