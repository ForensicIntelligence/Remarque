# Implementation decisions

## 2026-10-29: authorized rebuild, identity and versioning

The user authorized implementation of the full build specification and a private GitHub repository. Their requested bundle identifier `ca.forensicintelligence.remarque` supersedes the specification's temporary `.rebuild` identifier. It remains distinct from the surviving app's `ca.forensicintelligence.remarkable` identifier.

The target feature release is 3.0.0. Development starts at build 734, greater than the surviving 2.1 build 733. `VERSION.json` is the version authority. Distributable build numbers increase monotonically; development builds are visibly labelled until release qualification passes. Do not create a production release/tag before qualification.

Developer ID Application signing uses FI Forensic Intelligence, Ltd., team PATM9DNCLA. Local development can use ad-hoc signing where appropriate. Signing and notarization are separate; never claim notarization without a successful submission result.

The workspace previously inherited an unrelated Git repository rooted on Desktop. Remarque gets an independent repository rooted here. No operations modify the parent repository.

The original app archive stays local and is excluded from Git. The synthetic probes, recovered documentation, specification and implementation source belong in the private repository. Do not commit credentials, private signing material or build products.

## 2026-10-29: one right-pane toolbar

The user replaced the three-tab design with one row. Mermaid and LaTeX insertion buttons follow Table. Their menu arrows retain actions for the selected object; selecting a diagram or equation no longer swaps formatting controls. At narrow pane widths, only the formatting group scrolls; Table, Mermaid and LaTeX stay visible. This supersedes the original tab requirements.
