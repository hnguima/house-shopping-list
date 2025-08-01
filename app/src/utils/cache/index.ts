/**
 * Cache system based on .ignore/app patterns
 * Simple, direct, and effective caching for House Shopping List
 */

// Core cache managers
export { UserCacheManager } from "./userCacheManager";
export { ShoppingCacheManager } from "./shoppingCacheManager";
export { HomeCacheManager } from "./homeCacheManager";
export { BackgroundSync } from "./backgroundSync";

// Types
export type { CachedUserData } from "./userCacheManager";
export type { CachedShoppingData } from "./shoppingCacheManager";
export type { CachedHomeData } from "./homeCacheManager";

// Preferences utilities (for advanced usage)
export * from "./preferences";
