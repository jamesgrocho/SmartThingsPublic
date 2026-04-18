// swift-tools-version: 5.8
import PackageDescription

let package = Package(
    name: "FinderSidebarSync",
    platforms: [.macOS(.v12)],
    targets: [
        .executableTarget(
            name: "FinderSidebarSync",
            dependencies: ["SidebarBridge"],
            path: "Sources/FinderSidebarSync",
            linkerSettings: [
                .linkedFramework("CoreServices"),
                .linkedFramework("AppKit")
            ]
        ),
        .target(
            name: "SidebarBridge",
            path: "Sources/SidebarBridge",
            publicHeadersPath: ".",
            linkerSettings: [
                .linkedFramework("CoreServices")
            ]
        )
    ]
)
