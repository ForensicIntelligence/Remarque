# Writing tools checkpoint — 29 October 2026

Development work is ongoing. This checkpoint is not release qualification and the original installed application remains the production copy.

New implementation includes native preferences, public recent-document menus, start templates, source formatting/syntax colors/smart continuation/snippets, find/replace, a command palette, workspace browsing/search/wiki resolution, local snapshots and crash journals, table-grid editing, all seven equation palettes, and local media insertion. Some preference switches and menu routes still need their underlying behavior completed; the feature ledger marks these grouped areas in progress.

Validation: 13 Swift core tests pass; three hosted native integration tests pass; nine browser interaction tests pass. A further export test passes for HTML, Word, EPUB, LaTeX, Remarque ZIP, embedded Markdown, and slides, including three PNG graphics in the Word package. Full export fidelity, native PDF pagination and RTF image handling remain outstanding.

The native UI was inspected with the Guided Tour. Right-heading selection highlighted the corresponding source heading while focus stayed in the rendered editor. The inspection exposed an untitled-autosave bug: a macOS recovery write must not mark a draft Saved. The implementation now lets NSDocument own atomic writing and only updates the canonical saved digest when a named document clears its change count; a hosted regression test covers recovery autosave.

Remaining major work includes the complete visual diagram editor/card controls, import pipelines, export options and fidelity, richer Markdown constructs, source live mode, full preference wiring, external file conflicts, complete accessibility/IME/performance/security verification, documentation/onboarding, universal signed packaging and release qualification.
