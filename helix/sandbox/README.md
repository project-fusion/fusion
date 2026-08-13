# @helix-io/sandbox

Sandbox elements: an editable source pane beside a live preview.

**A separate package on purpose.** These are tooling, not design-system
components: nobody building a product needs a code pane. The previous Helix
exported its sandbox elements from the component library's public barrel, which
put roughly a tenth of the library, a code editor and a terminal among it, into
every consumer's install to serve one internal site.

Built to the same standards as everything else in Helix. Single tier, because
the headless and styled split exists so a consumer can bring their own
presentation, and nobody reskins a dev tool.
