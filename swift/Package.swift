// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "MembraneClient",
  platforms: [.macOS(.v13), .iOS(.v16)],
  products: [
    .library(name: "MembraneClient", targets: ["MembraneClient"]),
    .executable(name: "membrane-cli", targets: ["membrane-cli"]),
  ],
  dependencies: [
    .package(
      url: "https://github.com/apple/swift-openapi-generator",
      from: "1.13.1"
    ),
    .package(
      url: "https://github.com/apple/swift-openapi-runtime",
      from: "1.12.1"
    ),
    .package(
      url: "https://github.com/apple/swift-openapi-urlsession",
      from: "1.3.1"
    ),
    // Used by the tests to build responses for a stub transport.
    .package(
      url: "https://github.com/apple/swift-http-types",
      from: "1.7.0"
    ),
  ],
  targets: [
    .target(
      name: "MembraneClient",
      dependencies: [
        .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
        .product(name: "OpenAPIURLSession", package: "swift-openapi-urlsession"),
      ],
      plugins: [
        .plugin(name: "OpenAPIGenerator", package: "swift-openapi-generator")
      ]
    ),
    .executableTarget(
      name: "membrane-cli",
      dependencies: ["MembraneClient"]
    ),
    .testTarget(
      name: "MembraneClientTests",
      dependencies: [
        "MembraneClient",
        .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime"),
        .product(name: "HTTPTypes", package: "swift-http-types"),
      ]
    ),
  ]
)
