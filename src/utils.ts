import { UnityReleaseStream } from "./unityChangeset.ts";
import { SearchMode } from "./index.ts";

/**
 * Group array of objects by key
 */
export const groupBy = <T, K extends string>(
  arr: T[],
  key: (i: T) => K,
): Record<K, T[]> =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

/**
 * Convert search mode to array of streams
 */
export function searchModeToStreams(
  searchMode: SearchMode,
): UnityReleaseStream[] {
  switch (searchMode) {
    case SearchMode.All:
      return [
        UnityReleaseStream.LTS,
        UnityReleaseStream.SUPPORTED,
        UnityReleaseStream.TECH,
        UnityReleaseStream.BETA,
        UnityReleaseStream.ALPHA,
      ];
    case SearchMode.Default:
      return [
        UnityReleaseStream.LTS,
        UnityReleaseStream.SUPPORTED,
        UnityReleaseStream.TECH,
      ];
    case SearchMode.PreRelease:
      return [
        UnityReleaseStream.ALPHA,
        UnityReleaseStream.BETA,
      ];
    case SearchMode.LTS:
    case SearchMode.XLTS:
      return [
        UnityReleaseStream.LTS,
      ];
    case SearchMode.SUPPORTED:
      return [
        UnityReleaseStream.SUPPORTED,
      ];
    default:
      throw new Error(
        `The given search mode '${searchMode}' was not supported`,
      );
  }
}

/**
 * Sanitize version string to prevent injection attacks
 */
export function sanitizeVersion(version: string): string {
  if (typeof version !== "string") {
    throw new Error("Version must be a string");
  }
  // Allow only alphanumeric, dots, and specific characters
  const sanitized = version.replace(/[^a-zA-Z0-9.\-]/g, "");
  if (sanitized !== version) {
    throw new Error("Version contains invalid characters");
  }
  return sanitized;
}

/**
 * Validate filter options
 */
export function validateFilterOptions(
  options: { min?: string; max?: string; grep?: string },
): void {
  if (options.min && typeof options.min !== "string") {
    throw new Error("Min version must be a string");
  }
  if (options.max && typeof options.max !== "string") {
    throw new Error("Max version must be a string");
  }
  if (options.grep && typeof options.grep !== "string") {
    throw new Error("Grep pattern must be a string");
  }
  // Validate regex pattern safety
  if (options.grep) {
    try {
      new RegExp(options.grep, "i");
    } catch {
      throw new Error("Invalid grep pattern");
    }
  }
}
