#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SidebarBridge : NSObject

/// Returns all folder URLs currently pinned in the Finder sidebar Favorites.
+ (NSArray<NSURL *> *)sidebarItemURLs;

/// Removes and re-inserts the sidebar entry for the given folder URL so Finder
/// picks up the folder's current custom icon.
+ (void)refreshItemAtURL:(NSURL *)url;

@end

NS_ASSUME_NONNULL_END
