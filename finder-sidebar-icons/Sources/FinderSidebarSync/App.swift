import Foundation
import SidebarBridge

final class FinderSidebarSyncApp {

    private var sidebarDirWatcher: FSEventsWatcher?
    private var iconWatcher: FSEventsWatcher?

    private var sidebarFolders: Set<URL> = []
    private var lastSyncTime: [URL: Date] = [:]
    private let debounce: TimeInterval = 2.0

    private let sflDir: URL = FileManager.default.homeDirectoryForCurrentUser
        .appendingPathComponent("Library/Application Support/com.apple.sharedfilelist")

    func start() {
        NSLog("[FinderSidebarSync] Starting.")
        refreshSidebarFolders()
        watchSidebarDirectory()
    }

    private func refreshSidebarFolders() {
        let fresh = Set(SidebarBridge.sidebarItemURLs().map { $0.standardized })
        guard fresh != sidebarFolders else { return }
        sidebarFolders = fresh
        NSLog("[FinderSidebarSync] Tracking %d sidebar folder(s).", sidebarFolders.count)
        resetIconWatcher()
    }

    private func watchSidebarDirectory() {
        sidebarDirWatcher = FSEventsWatcher(paths: [sflDir.path]) { [weak self] _, _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                self?.refreshSidebarFolders()
            }
        }
        sidebarDirWatcher?.start()
    }

    private func resetIconWatcher() {
        iconWatcher?.stop()
        let paths = sidebarFolders.map { $0.path }
        guard !paths.isEmpty else { return }

        iconWatcher = FSEventsWatcher(paths: paths) { [weak self] changedPath, flags in
            self?.handleFSEvent(path: changedPath, flags: flags)
        }
        iconWatcher?.start()
    }

    private func handleFSEvent(path: String, flags: FSEventStreamEventFlags) {
        let url = URL(fileURLWithPath: path)

        let isXattr = flags & UInt32(kFSEventStreamEventFlagItemXattrMod) != 0
        let isDir   = flags & UInt32(kFSEventStreamEventFlagItemIsDir)    != 0
        let isIconFile = url.lastPathComponent == "Icon\r"

        guard (isXattr && isDir) || isIconFile else { return }

        let folderURL: URL
        if isIconFile {
            folderURL = url.deletingLastPathComponent().standardized
        } else {
            folderURL = url.standardized
        }

        guard sidebarFolders.contains(folderURL) else { return }

        let now = Date()
        if let last = lastSyncTime[folderURL], now.timeIntervalSince(last) < debounce { return }
        lastSyncTime[folderURL] = now

        NSLog("[FinderSidebarSync] Icon change detected: %@", folderURL.path)

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.syncSidebarIcon(for: folderURL)
        }
    }

    private func syncSidebarIcon(for folderURL: URL) {
        NSLog("[FinderSidebarSync] Refreshing sidebar icon: %@", folderURL.path)
        SidebarBridge.refreshItem(at: folderURL)
    }
}
