/**
 * Data Source Configuration
 * 
 * Central configuration for data source modes and migration settings.
 */

import { DataSourceMode } from "./data-source-adapter";

export { getDataSourceMode } from "./data-source-adapter";

/**
 * Data source configuration interface
 */
export interface DataSourceConfig {
  mode: DataSourceMode;
  supabaseEnabledTypes: string[];
  fallbackToLocal: boolean;
  migrationStatus: Record<string, "not-started" | "in-progress" | "completed" | "failed">;
}

/**
 * Default configuration
 */
export const defaultDataSourceConfig: DataSourceConfig = {
  mode: "local", // Start with localStorage for safety
  supabaseEnabledTypes: [], // No types migrated yet
  fallbackToLocal: true, // Always fallback to localStorage on error
  migrationStatus: {
    users: "not-started",
    sellers: "not-started",
    products: "not-started",
    orders: "not-started",
    reviews: "not-started",
    coupons: "not-started",
    returns: "not-started",
    support: "not-started",
    notifications: "not-started",
    wishlists: "not-started",
    carts: "not-started",
  },
};

/**
 * Get current configuration from environment or defaults
 */
export function getDataSourceConfig(): DataSourceConfig {
  const mode = (process.env.NEXT_PUBLIC_DATA_SOURCE_MODE as DataSourceMode) || "local";
  const enabledTypes = process.env.NEXT_PUBLIC_SUPABASE_ENABLED_TYPES?.split(",") || [];
  const fallback = process.env.NEXT_PUBLIC_FALLBACK_TO_LOCAL !== "false";

  return {
    mode,
    supabaseEnabledTypes: enabledTypes,
    fallbackToLocal: fallback,
    migrationStatus: defaultDataSourceConfig.migrationStatus,
  };
}

/**
 * Check if a specific data type has been migrated to Supabase
 */
export function isDataTypeMigrated(dataType: string): boolean {
  const config = getDataSourceConfig();
  return config.supabaseEnabledTypes.includes(dataType);
}

/**
 * Update migration status for a data type
 * This would typically be called during migration scripts
 */
export function updateMigrationStatus(dataType: string, status: "not-started" | "in-progress" | "completed" | "failed"): void {
  // In a real implementation, this would update a database table or configuration file
  // For now, this is a placeholder
  console.log(`Migration status for ${dataType}: ${status}`);
}

/**
 * Get migration status for all data types
 */
export function getMigrationStatus(): Record<string, string> {
  const config = getDataSourceConfig();
  return config.migrationStatus;
}

/**
 * Data type priority for migration order
 */
export const migrationPriority = [
  "users", // First: users/authentication
  "sellers", // Second: seller profiles
  "products", // Third: products
  "orders", // Fourth: orders
  "reviews", // Fifth: reviews
  "coupons", // Sixth: coupons
  "wishlists", // Seventh: wishlists
  "carts", // Eighth: carts
  "returns", // Ninth: returns
  "support", // Tenth: support tickets
  "notifications", // Last: notifications
];

/**
 * Get next data type to migrate based on priority
 */
export function getNextDataTypeToMigrate(): string | null {
  const status = getMigrationStatus();
  
  for (const dataType of migrationPriority) {
    if (status[dataType] === "not-started" || status[dataType] === "failed") {
      return dataType;
    }
  }
  
  return null; // All migrated or in progress
}

/**
 * Check if all data types have been migrated
 */
export function isMigrationComplete(): boolean {
  const status = getMigrationStatus();
  return Object.values(status).every(s => s === "completed");
}

/**
 * Get migration progress percentage
 */
export function getMigrationProgress(): number {
  const status = getMigrationStatus();
  const total = Object.keys(status).length;
  const completed = Object.values(status).filter(s => s === "completed").length;
  return Math.round((completed / total) * 100);
}
