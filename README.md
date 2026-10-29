# Remarque

The first phase inventories the surviving **Remarque 2.1 (733)** application and specifies its rebuild. Prepared **29 October 2026**. Implementation is in progress on `codex/rebuild`; the application is a development build and has not passed the full release gates.

**Build:** Remarque 3.0.2 (738), a signed universal development build. See the [build report and verification limits](docs/implementation/BUILD_REPORT.md). The original installed app is preserved.

**New in 3.0.2:** One formatting toolbar, with Mermaid and LaTeX insertion buttons immediately after Table. [Update notes](docs/implementation/UPDATE_3.0.2.md).

**Also included from 3.0.1:** A clearer synchronized-scrolling toggle (on by default), scrolling in both editing modes, and illustrated offline documentation with diagrams, equations, and source/result examples. [Update notes](docs/implementation/UPDATE_3.0.1.md).

**Primary handoff:** [Complete Codex build specification](REMARQUE_BUILD_SPECIFICATION.md). This single Markdown document includes the full 226-feature inventory, exact controls, synchronized editing requirements, architecture, implementation milestones, acceptance tests, fixtures, and comprehensive Mermaid support covering 33 families and at least 41 starter templates. The right pane has one formatting toolbar, with **Mermaid** and **LaTeX** buttons immediately after **Table**.

The consolidated specification is authoritative for the rebuild. The documents below remain useful as individual references and the original audit record.

Read in this order:

1. [Feature inventory](docs/FEATURE_INVENTORY.md) — discovered capabilities, preservation contracts and evidence levels.
2. [Rebuild specification](docs/REBUILD_SPECIFICATION.md) — right-pane selection to source, live editing in both panes, and a single Word-like toolbar with Mermaid and LaTeX insertion buttons; architecture and acceptance tests.
3. [Control reference](docs/CONTROL_REFERENCE.md) — settings, observed values, menu commands, shortcuts, equation palettes and snippets.
4. [Verification record](docs/VERIFICATION.md) — exercised behaviors, actual exports, discrepancies and remaining checks.
5. [Recovery report](docs/RECOVERY.md) — archived application and useful recovered resources/metadata; original Swift source was not recovered.
6. [Comprehensive Mermaid support](docs/MERMAID_COMPREHENSIVE_SUPPORT.md) — expanded chart catalogue, templates, themes/layouts, engine packaging and per-format release tests; also included in the primary handoff.

Supporting materials:

- [Machine-readable feature index](docs/feature-index.json).
- [Synthetic feature probe](docs/fixtures/feature-probe.md).
- [Original application exports](docs/evidence/exports/).
- [UI screenshots and evidence](docs/evidence/).
- [Installed app archive](recovery/Remarque-2.1-733.zip).

The archive is a local preservation copy on this machine. The independent private repository is https://github.com/ForensicIntelligence/Remarque. Tested implementation milestones are pushed to `codex/rebuild`.

## Build and test

Open `RemarqueRebuild.xcodeproj` and use the `RemarqueRebuild` scheme, or run `scripts/build.sh`. Web assets are bundled locally; `Web/package-lock.json` pins dependencies. `scripts/test.sh` runs the Swift core, browser, and hosted WebKit tests. The browser tests currently use Google Chrome’s standard macOS path.

`VERSION.json` controls version **3.0.2**, development build **738**, and bundle identifier **ca.forensicintelligence.remarque**. `node scripts/version.mjs --next-build` advances a distributable build; regenerate the project with XcodeGen afterward. Developer ID signing uses FI Forensic Intelligence, Ltd. (PATM9DNCLA). `scripts/release.sh` creates the signed universal application and ZIP; notarization is separate. The installed original app is untouched.

See [implementation checkpoints](docs/implementation/checkpoints/) and [feature coverage](docs/implementation/feature-coverage.json) for actual progress and outstanding verification.
