# @fusion.dev/helix-docs

The Helix documentation as content: the pages, and the registry that names them.

```sh
npm install @fusion.dev/helix-docs
```

```js
import { catalog, findInCatalog, reference } from '@fusion.dev/helix-docs'
```

Published as a package rather than served only from a site so that the
documentation carries the version of the library it documents. A docs package at
version x describes Helix at version x, which is why versioning here is per
domain rather than per repository.

Rendered at [fusion.dev/helix](https://fusion.dev/helix). Install this if you are
building your own surface over the same content.

MIT
