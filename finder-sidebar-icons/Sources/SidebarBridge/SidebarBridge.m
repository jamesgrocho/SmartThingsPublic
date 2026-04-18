#import "SidebarBridge.h"

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"

#import <CoreServices/CoreServices.h>

@implementation SidebarBridge

+ (NSArray<NSURL *> *)sidebarItemURLs {
    NSMutableArray<NSURL *> *urls = [NSMutableArray array];

    LSSharedFileListRef list = LSSharedFileListCreate(NULL, kLSSharedFileListFavoriteItems, NULL);
    if (!list) return urls;

    UInt32 seed = 0;
    CFArrayRef snapshot = LSSharedFileListCopySnapshot(list, &seed);
    if (snapshot) {
        CFIndex count = CFArrayGetCount(snapshot);
        for (CFIndex i = 0; i < count; i++) {
            LSSharedFileListItemRef item = (LSSharedFileListItemRef)CFArrayGetValueAtIndex(snapshot, i);
            CFURLRef urlRef = LSSharedFileListItemCopyResolvedURL(item, 0, NULL);
            if (urlRef) {
                NSURL *url = CFBridgingRelease(urlRef);
                BOOL isDir = NO;
                if ([[NSFileManager defaultManager] fileExistsAtPath:url.path isDirectory:&isDir] && isDir) {
                    [urls addObject:url];
                }
            }
        }
        CFRelease(snapshot);
    }

    CFRelease(list);
    return urls;
}

+ (void)refreshItemAtURL:(NSURL *)url {
    LSSharedFileListRef list = LSSharedFileListCreate(NULL, kLSSharedFileListFavoriteItems, NULL);
    if (!list) return;

    UInt32 seed = 0;
    CFArrayRef snapshot = LSSharedFileListCopySnapshot(list, &seed);
    if (!snapshot) {
        CFRelease(list);
        return;
    }

    CFIndex count = CFArrayGetCount(snapshot);
    LSSharedFileListItemRef targetItem = NULL;
    LSSharedFileListItemRef itemBefore = NULL;

    NSURL *standardTarget = url.standardizedURL;

    for (CFIndex i = 0; i < count; i++) {
        LSSharedFileListItemRef item = (LSSharedFileListItemRef)CFArrayGetValueAtIndex(snapshot, i);
        CFURLRef urlRef = LSSharedFileListItemCopyResolvedURL(item, 0, NULL);
        if (!urlRef) continue;

        NSURL *itemURL = [CFBridgingRelease(urlRef) standardizedURL];
        if ([itemURL isEqual:standardTarget]) {
            targetItem = item;
            itemBefore = (i > 0)
                ? (LSSharedFileListItemRef)CFArrayGetValueAtIndex(snapshot, i - 1)
                : NULL;
            break;
        }
    }

    if (targetItem) {
        LSSharedFileListItemRemove(list, targetItem);

        LSSharedFileListItemRef insertAfter = itemBefore
            ? itemBefore
            : kLSSharedFileListItemBeforeFirst;

        LSSharedFileListInsertItemURL(list, insertAfter, NULL, NULL,
                                      (__bridge CFURLRef)url, NULL, NULL);
    }

    CFRelease(snapshot);
    CFRelease(list);
}

@end

#pragma clang diagnostic pop
