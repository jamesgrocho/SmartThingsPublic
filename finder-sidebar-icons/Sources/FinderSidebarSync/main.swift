import Foundation

signal(SIGINT)  { _ in exit(0) }
signal(SIGTERM) { _ in exit(0) }

let app = FinderSidebarSyncApp()
app.start()

RunLoop.main.run()
