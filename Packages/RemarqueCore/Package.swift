// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "RemarqueCore", platforms: [.macOS(.v14)], products: [
    .library(name: "RemarqueCore", targets: ["RemarqueCore"])
], targets: [.target(name: "RemarqueCore"), .testTarget(name: "RemarqueCoreTests", dependencies: ["RemarqueCore"])])
