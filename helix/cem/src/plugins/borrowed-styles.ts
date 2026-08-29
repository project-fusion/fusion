import type {
  HelixContext,
  HelixCssProperty,
  HelixDeclaration,
  HelixManifest,
  HelixModule,
  Plugin,
} from '../types.js'

/**
 * Copies a component's hooks onto whatever borrowed its stylesheet outright.
 *
 * **Borrowing a stylesheet is not inheritance, not a mixin and not a part, and
 * no manifest field has a name for it.** `HelixCopyButton` sets
 * `static override styles = [HelixIconButton.styles, styles].flat()`, so it
 * genuinely answers `--icon-button-radii`, `--icon-button-size` and
 * `--icon-button-shadow`: the rules reading them are in its shadow root because
 * it put them there. The analyzer records none of it. It derives hooks from
 * `@cssproperty` on the class, and there is no class relationship here to
 * follow, so the manifest said zero and a consumer reading the documentation
 * could not know the three exist. See (290).
 *
 * **This is the half a consumer gets before they have a page.**
 * `@fusion.dev/helix-diagnostics` settles the same question at runtime by
 * reading the element's own shadow styles for a `var()`, which is stronger
 * evidence than the manifest and available only in a page.
 *
 * **A plugin rather than three `@cssproperty` tags on the borrower**, which was
 * the other option and is worse twice over. It is manual, so it drifts the day
 * the icon button gains a fourth hook. And it does not even work: the `hooks` rule
 * derives a hook's owner from the directory the declaring file sits in, so
 * `@cssproperty --icon-button-radii` written in `copy-button/root/` documents a
 * name `copy-button` does not own, which is exactly the rule that check exists
 * to enforce. The honest record is that the hook still belongs to the icon
 * button and is answered here, and `inheritedFrom` is the field that says so.
 *
 * **Only a direct `X.styles` reference counts.** The initializer is walked for
 * a property access whose property is `styles` and whose target is a plain
 * identifier, which is the shape every borrower in the library uses and is
 * statically decidable. Anything computed is left alone rather than guessed at:
 * a hook wrongly attributed to a component reads as API and is worse than one
 * that is missing, because a consumer sets it and nothing happens.
 */
export const borrowedStyles = (): Plugin => {
  /*
   * Class name to the classes whose stylesheet it borrowed.
   *
   * Held in a closure rather than written onto the declaration, because the
   * borrow is how the manifest was built and not something a consumer of it
   * needs: publishing it would be a second public field saying what
   * `inheritedFrom` already says on each hook it produced. `analyzePhase` sees
   * every module in the package before `packageLinkPhase` runs once, so the map
   * is complete by the time it is read.
   */
  const borrowed = new Map<string, string[]>()

  return {
    analyzePhase({ node, ts }) {
      if (!ts.isClassDeclaration(node)) {
        return
      }
      const name = node.name?.getText()
      if (name === undefined) {
        return
      }

      for (const member of node.members) {
        if (!ts.isPropertyDeclaration(member) || member.name.getText() !== 'styles') {
          continue
        }
        const isStatic = member.modifiers?.some((one) => one.kind === ts.SyntaxKind.StaticKeyword)
        if (isStatic !== true || member.initializer === undefined) {
          continue
        }

        /* Taken off the callback's own `ts` rather than imported. The analyzer
           hands each plugin its bundled TypeScript 5.4, so an import here would
           pull 7's node types onto 5.4's nodes, which is the rule at the top of
           `AGENTS.md` about what a cem plugin may not do. */
        type Node = Parameters<typeof ts.forEachChild>[0]

        const sources: string[] = []
        const walk = (current: Node): void => {
          if (
            ts.isPropertyAccessExpression(current) &&
            current.name.getText() === 'styles' &&
            ts.isIdentifier(current.expression)
          ) {
            const source = current.expression.getText()
            /* A class naming itself is `super.styles` written the long way, and
               the analyzer already resolves real inheritance. */
            if (source !== name && !sources.includes(source)) {
              sources.push(source)
            }
          }
          ts.forEachChild(current, walk)
        }
        walk(member.initializer)

        if (sources.length > 0) {
          borrowed.set(name, sources)
        }
      }
    },

    name: 'helix-borrowed-styles',

    packageLinkPhase({ context, customElementsManifest }) {
      if (borrowed.size === 0) {
        return
      }
      const manifests = [
        customElementsManifest as HelixManifest,
        ...((context as HelixContext).thirdPartyCEMs ?? []),
      ]

      /* Name to declaration *and* the module it came from, because
         `inheritedFrom` carries both and `classIndex` keeps only the first. */
      const index = new Map<string, { declaration: HelixDeclaration; module: HelixModule }>()
      for (const manifest of manifests) {
        for (const module of manifest.modules ?? []) {
          for (const declaration of module.declarations ?? []) {
            if (declaration.kind === 'class' && !index.has(declaration.name)) {
              index.set(declaration.name, { declaration, module })
            }
          }
        }
      }

      for (const [name, sources] of borrowed) {
        const target = index.get(name)?.declaration
        if (target === undefined) {
          continue
        }
        /* The borrower's own `@cssproperty` wins. It documents the hook against
           the component a consumer is actually reading about, and a second entry
           under one name would print the row twice. */
        const held = new Set((target.cssProperties ?? []).map((one) => one.name))
        const gained: HelixCssProperty[] = []

        for (const source of sources) {
          const found = index.get(source)
          if (found === undefined) {
            continue
          }
          for (const hook of found.declaration.cssProperties ?? []) {
            if (held.has(hook.name)) {
              continue
            }
            held.add(hook.name)
            gained.push({
              ...hook,
              inheritedFrom: {
                name: source,
                ...(found.module.path === undefined ? {} : { module: found.module.path }),
              },
            })
          }
        }

        if (gained.length > 0) {
          /* Appended rather than merged and sorted: the component's own hooks
             are what a reader came for, and the borrowed ones follow in the
             source order the lender declared them in, which is stable. */
          target.cssProperties = [...(target.cssProperties ?? []), ...gained]
        }
      }
    },
  }
}
