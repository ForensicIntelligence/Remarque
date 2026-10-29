# Editor core checkpoint — 29 October 2026

This is an implementation milestone, not a release qualification or a claim of full feature parity.

Implemented: native document shell; canonical UTF-8 source engine with revision validation and shared undo; source and structured right editor; source selection mapping; exact toolbar tab labels; local MathJax and Mermaid engines; 33-family / 41-template Mermaid catalogue with style choices. Baseline feature restoration remains in progress.

Validation at this checkpoint:

- 8 Swift engine tests pass, including mixed-newline/BOM preservation, invalid UTF-8 rejection, Unicode boundaries, atomic rejection, chronological undo/redo and randomized edit restoration.
- 8 projection tests pass, including repeated headings, escaped/entity source positions, table cell edits and long fences.
- 7 real-browser tests pass, including typing, formatting, table edits, paragraph insertion, local equation rendering and all 41 Mermaid templates. Subsequent bundle packaging changed to a single local script for WebKit compatibility; repeat browser tests before release.
- 2 hosted native tests pass in the actual sandboxed WKWebView: native identity/document byte round trip, right-to-left editing, left-to-right editing and shared undo/redo without focus theft.

WebKit requires the network-client entitlement to launch its local subprocesses on this OS. Remarque blocks HTTP(S) resources with a native content-rule list, a restrictive CSP and navigation policy. No runtime CDN is used. The full release network and accessibility audits remain outstanding.

The editor is packaged as a local IIFE because file-origin ES module imports did not initialize reliably in the sandboxed WKWebView. Source remains modular and editable; the generated bundle is reproducible from the lockfile.
