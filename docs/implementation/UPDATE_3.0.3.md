# Remarque 3.0.3 · build 739

The product and display name are **Remarque**. The application’s bundle identifier and code-signing identifier are **`ca.forensicintelligence.remarkable`**, as corrected by the user. This supersedes the `ca.forensicintelligence.remarque` identifier used by development builds 734–738.

The Developer ID Application certificate remains **FI Forensic Intelligence, Ltd. (PATM9DNCLA)**. The product keeps its existing single formatting toolbar and all other functionality. The original installed binary and earlier distribution archives are preserved.

`VERSION.json`, `project.yml`, the checked-in Xcode project, and the native identity test agree on the corrected identity. The version check rejects inconsistent identifiers across both project descriptions. The native test also checks the product and display names. The test bundle identifier is `ca.forensicintelligence.remarkable.tests`.

Release verification uses the publisher’s Developer ID for both local hosted tests and the universal distribution app. Standalone test runs can set `REMARQUE_TEST_SIGNING_IDENTITY`; CI defaults to ad-hoc signing in its fresh environment.

The ZIP includes Apple Silicon and Intel executables, hardened runtime, and a SHA-256 companion file. This remains a development build without Apple notarization. See [the build report](BUILD_REPORT.md) for broader qualification limits.
