import Foundation
import SidebarBridge

final class FinderSidebarSyncApp {

    private var sidebarFolders: Set<URL> = []

    func start() {
        NSLog("[FinderSidebarSync] Starting.")
        refreshSidebarFolders()

        let queue = DispatchQueue(label: "com.user.findersidebaricons.monitor", qos: .background)
        queue.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.pollForever(on: queue)
        }
    }

    private func pollForever(on queue: DispatchQueue) {
        queue.asyncAfter(deadline: .now() + 1.0) { [weak self] in
            self?.refreshSidebarFolders()
            self?.syncAllSidebarIcons()
            self?.pollForever(on: queue)
        }
    }

    private func refreshSidebarFolders() {
        let fresh = Set(SidebarBridge.sidebarItemURLs().map { $0.standardized })
        guard fresh != sidebarFolders else { return }
        sidebarFolders = fresh
        NSLog("[FinderSidebarSync] Tracking %d sidebar folder(s).", sidebarFolders.count)
    }

    private func syncAllSidebarIcons() {
        for folder in sidebarFolders {
            SidebarBridge.refreshItem(at: folder)
        }
        NSLog("[FinderSidebarSync] Synced %d sidebar icon(s).", sidebarFolders.count)
    }
}
