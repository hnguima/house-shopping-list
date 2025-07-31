/**
 * Cache system based on .ignore/app patterns
 * Simple, direct, and effective caching for House Shopping List
 */

// Core cache managers
export { UserCacheManager } from "./userCacheManager";
export { ShoppingCacheManager } from "./shoppingCacheManager";
export { BackgroundSync } from "./backgroundSync";

// Types
export type { CachedUserData } from "./userCacheManager";
export type { CachedShoppingData } from "./shoppingCacheManager";

// Preferences utilities (for advanced usage)
export * from "./preferences";
