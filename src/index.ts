import { getUnityReleases } from "./unityGraphQL.ts";
import {
  UnityChangeset as UnityChangesetClass,
  UnityReleaseEntitlement,
  UnityReleaseStream,
} from "./unityChangeset.ts";
import {
  groupBy,
  sanitizeVersion,
  searchModeToStreams,
  validateFilterOptions,
} from "./utils.ts";

const UNITY_CHANGESETS_DB_URL =
  "https://mob-sakai.github.io/unity-changeset/dbV3";
export const UnityChangeset = UnityChangesetClass;
export type UnityChangeset = UnityChangesetClass;
export { UnityReleaseEntitlement, UnityReleaseStream };

/**
 * Retrieves the Unity changeset for a specific version.
 * @param version - The Unity version string (e.g., "2020.1.14f1").
 * @returns A Promise that resolves to the UnityChangeset object.
 * @throws Error if the version is not found.
 */
export async function getUnityChangeset(
  version: string,
): Promise<UnityChangeset> {
  const sanitizedVersion = sanitizeVersion(version);

  let changesets: UnityChangeset[];
  try {
    changesets = await getUnityReleases(
      sanitizedVersion,
      searchModeToStreams(SearchMode.All),
      [UnityReleaseEntitlement.XLTS],
    );
  } catch {
    changesets = await getAllChangesetsFromDb();
  }

  if (!changesets || !Array.isArray(changesets)) {
    throw new Error("Failed to retrieve changesets");
  }

  changesets = changesets.filter(
    (c) => c.version === sanitizedVersion,
  );
  if (0 < changesets.length) {
    return changesets[0];
  }

  throw Error(`The given version '${sanitizedVersion}' was not found.`);
}

/*
 * Search mode.
 *
 * All: All changesets.
 * Default: Only non pre-release changesets.
 * PreRelease: Only pre-release (alpha/beta) changesets.
 */
export enum SearchMode {
  All = 0,
  Default = 2,
  PreRelease = 3,
  LTS = 4,
  Supported = 6,
}

/*
 * Group mode.
 *
 * All: All the changesets.
 * OldestPatch: Only the oldest patch changesets.
 * LatestPatch: Only the latest patch changesets.
 * LatestLifecycle: Only the latest lifecycle changesets.
 */
export enum GroupMode {
  All = "all",
  OldestPatch = "oldest-patch",
  LatestPatch = "latest-patch",
  LatestLifecycle = "latest-lifecycle",
}

/*
 * Filter options.
 *
 * min: The minimum version. eg. 2018.4
 * max: The maximum version. eg. 2019.4
 * grep: The grep pattern. eg. 20(18|19)
 * allLifecycles: Include all the lifecycles.
 * lts: Include only the LTS versions.
 */
export interface FilterOptions {
  min: string;
  max: string;
  grep: string;
  allLifecycles: boolean;
  xlts: boolean;
}

/*
 * Output mode.
 *
 * Changeset: The changeset.
 * VersionOnly: Only the version.
 * MinorVersionOnly: Only the minor version.
 */
export enum OutputMode {
  Changeset = "changeset",
  VersionOnly = "version",
  MinorVersionOnly = "minor-version",
}

/*
 * Format mode.
 *
 * None: No format.
 * Json: JSON format.
 * PrettyJson: Pretty JSON format.
 */
export enum FormatMode {
  None = "none",
  Json = "json",
  PrettyJson = "pretty-json",
}

/**
 * Lists Unity changesets based on search, filter, group, output, and format options.
 * @param searchMode - The search mode to use.
 * @param filterOptions - The filter options to apply.
 * @param groupMode - The group mode to use.
 * @param outputMode - The output mode for the results.
 * @param formatMode - The format mode for the output.
 * @returns A Promise that resolves to a formatted string of the results.
 */
export function listChangesets(
  searchMode: SearchMode,
  filterOptions: FilterOptions,
  groupMode: GroupMode,
  outputMode: OutputMode,
  formatMode: FormatMode,
): Promise<string> {
  return searchChangesets(searchMode)
    .then((results) => filterChangesets(results, filterOptions))
    .then((results) =>
      results.sort((a, b) => b.versionNumber - a.versionNumber)
    )
    .then((results) => groupChangesets(results, groupMode))
    .then((results) => {
      switch (outputMode) {
        case OutputMode.Changeset:
          return results;
        case OutputMode.VersionOnly:
          return results.map((c) => c.version);
        case OutputMode.MinorVersionOnly:
          return results.map((c) => c.minor);
        default:
          throw Error(
            `The given output mode '${outputMode}' was not supported`,
          );
      }
    })
    .then((results) => {
      switch (formatMode) {
        case FormatMode.None:
          return results.join("\n");
        case FormatMode.Json:
          return JSON.stringify(results);
        case FormatMode.PrettyJson:
          return JSON.stringify(results, null, 2);
        default:
          throw Error(
            `The given format mode '${formatMode}' was not supported`,
          );
      }
    });
}

/**
 * Searches for Unity changesets based on the specified search mode.
 * @param searchMode - The search mode to use.
 * @returns A Promise that resolves to an array of UnityChangeset objects.
 * @throws Error if the search mode is not supported.
 */
export async function searchChangesets(
  searchMode: SearchMode,
): Promise<UnityChangeset[]> {
  const streams = searchModeToStreams(searchMode);
  try {
    return await getUnityReleases(".", streams, [UnityReleaseEntitlement.XLTS]);
  } catch {
    return await searchChangesetsFromDb(streams);
  }
}

/**
 * Filters an array of Unity changesets based on the provided options.
 * @param changesets - The array of UnityChangeset objects to filter.
 * @param options - The filter options.
 * @returns An array of filtered UnityChangeset objects.
 */
export function filterChangesets(
  changesets: UnityChangeset[],
  options: FilterOptions,
): UnityChangeset[] {
  if (!changesets || !Array.isArray(changesets)) return [];
  if (changesets.length == 0) return [];

  validateFilterOptions(options);

  // Min version number
  const min = options.min
    ? UnityChangeset.toNumber(options.min, false)
    : Number.MIN_VALUE;
  // Max version number
  const max = options.max
    ? UnityChangeset.toNumber(options.max, true)
    : Number.MAX_VALUE;
  // Grep pattern
  const regex = options.grep ? new RegExp(options.grep, "i") : null;
  // Lifecycle filter
  const lc = options.allLifecycles
    ? null
    : Object.values(groupBy(changesets, (r) => r.minor)).map((g) => g[0]);

  return changesets.filter(
    (c) =>
      min <= c.versionNumber &&
      c.versionNumber <= max &&
      (options.xlts || !c.xlts) && // Include XLTS?
      (!regex || regex.test(c.version)) &&
      (!lc || lc.some((l) => l.minor == c.minor && l.lifecycle == c.lifecycle)),
  );
}

/**
 * Groups an array of Unity changesets based on the specified group mode.
 * @param changesets - The array of UnityChangeset objects to group.
 * @param groupMode - The group mode to use.
 * @returns An array of grouped UnityChangeset objects.
 * @throws Error if the group mode is not supported.
 */
export function groupChangesets(
  changesets: UnityChangeset[],
  groupMode: GroupMode,
): UnityChangeset[] {
  if (!changesets || !Array.isArray(changesets)) return [];
  if (changesets.length == 0) return [];

  switch (groupMode) {
    case GroupMode.All:
      return changesets;
    case GroupMode.LatestLifecycle:
      return Object.values(groupBy(changesets, (r) => r.minor))
        .map((g) => g.filter((v) => v.lifecycle == g[0].lifecycle))
        .flat();
    case GroupMode.LatestPatch:
      return Object.values(groupBy(changesets, (r) => r.minor)).map(
        (g) => g[0],
      );
    case GroupMode.OldestPatch:
      return Object.values(groupBy(changesets, (r) => r.minor))
        .map((g) => g.filter((v) => v.lifecycle == g[0].lifecycle))
        .map((g) => g[g.length - 1]);
    default:
      throw Error(`The given group mode '${groupMode}' was not supported`);
  }
}

/**
 * Retrieves all Unity changesets from the database.
 * @returns A Promise that resolves to an array of all UnityChangeset objects from the database.
 * @throws Error if the database cannot be fetched or is invalid.
 */
export function getAllChangesetsFromDb(): Promise<UnityChangeset[]> {
  return fetch(UNITY_CHANGESETS_DB_URL)
    .then((res) => {
      if (!res.ok) {
        throw Error(
          `The Unity changeset database could not be fetched: ${res.status} ${res.statusText}`,
        );
      }

      return res.json() as Promise<UnityChangeset[]>;
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error("Invalid changeset database format: expected array");
      }
      return data;
    });
}

/**
 * Searches for Unity changesets from the database based on the specified search mode.
 * @param streams - The array of release streams to filter by.
 * @returns A Promise that resolves to an array of UnityChangeset objects from the database.
 */
export function searchChangesetsFromDb(
  streams: UnityReleaseStream[],
): Promise<UnityChangeset[]> {
  return getAllChangesetsFromDb()
    .then((changesets: UnityChangeset[]) => {
      if (!changesets || !Array.isArray(changesets)) return [];
      if (changesets.length == 0) return [];

      return changesets.filter((c) => streams.includes(c.stream));
    });
}
