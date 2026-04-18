import CoreServices
import Foundation

final class FSEventsWatcher {
    private var stream: FSEventStreamRef?
    private let callback: (String, FSEventStreamEventFlags) -> Void
    let paths: [String]

    init(paths: [String], callback: @escaping (String, FSEventStreamEventFlags) -> Void) {
        self.paths = paths
        self.callback = callback
    }

    func start() {
        guard stream == nil, !paths.isEmpty else { return }

        var ctx = FSEventStreamContext(
            version: 0,
            info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil, release: nil, copyDescription: nil
        )

        let flags = UInt32(
            kFSEventStreamCreateFlagFileEvents |
            kFSEventStreamCreateFlagWatchRoot  |
            kFSEventStreamCreateFlagNoDefer
        )

        stream = FSEventStreamCreate(
            nil,
            { _, info, numEvents, rawPaths, rawFlags, _ in
                guard let info else { return }
                let watcher = Unmanaged<FSEventsWatcher>.fromOpaque(info).takeUnretainedValue()
                let paths = unsafeBitCast(rawPaths, to: NSArray.self) as! [String]
                for i in 0..<numEvents {
                    watcher.callback(paths[i], rawFlags[i])
                }
            },
            &ctx,
            paths as CFArray,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
            0.5,
            flags
        )

        if let s = stream {
            FSEventStreamScheduleWithRunLoop(s, CFRunLoopGetMain(), CFRunLoopMode.defaultMode.rawValue)
            FSEventStreamStart(s)
        }
    }

    func stop() {
        guard let s = stream else { return }
        FSEventStreamStop(s)
        FSEventStreamInvalidate(s)
        FSEventStreamRelease(s)
        stream = nil
    }

    deinit { stop() }
}
