import { getUnityReleases, getUnityReleasesInLTS } from "./unityGraphQL.ts";
import {
  UnityChangeset as UnityChangesetClass,
  UnityReleaseEntitlement,
  UnityReleaseStream,
} from "./unityChangeset.ts";

const UNITY_CHANGESETS_DB_URL =
  "https://mob-sakai.github.io/unity-changeset/dbV3";
export const UnityChangeset = UnityChangesetClass;
export type UnityChangeset = UnityChangesetClass;

/*
 * Get an Unity changeset from specific Unity version.
 * @param version The Unity version.
 * @returns An Unity changeset.
 */
export async function getUnityChangeset(
  version: string,
): Promise<UnityChangeset> {
  let changesets: UnityChangeset[];
  try {
    changesets = await getUnityReleases(version, []);
  } catch {
    changesets = await getAllChangesetsFromDb();
  }

  changesets = changesets.filter(
    (c) => c.version === version,
  );
  if (0 < changesets.length) {
    return changesets[0];
  }

  throw Error(`The given version '${version}' was not found.`);
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
  XLTS = 5,
  SUPPORTED = 6,
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
  lts: boolean;
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

export async function searchChangesets(
  searchMode: SearchMode,
): Promise<UnityChangeset[]> {
  try {
    switch (searchMode) {
      case SearchMode.All:
      case SearchMode.Default:
      case SearchMode.PreRelease:
      case SearchMode.SUPPORTED:
        return await getUnityReleases(".", searchModeToStreams(searchMode));
      case SearchMode.LTS:
        return await getUnityReleasesInLTS();
      case SearchMode.XLTS:
        return await getUnityReleasesInLTS([UnityReleaseEntitlement.XLTS]);
      default:
        throw Error(`The given search mode '${searchMode}' was not supported`);
    }
  } catch {
    return await searchChangesetsFromDb(searchMode);
  }
}

export function filterChangesets(
  changesets: UnityChangeset[],
  options: FilterOptions,
): UnityChangeset[] {
  if (!changesets || changesets.length == 0) return [];

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
      (!options.lts || c.lts) &&
      (!regex || regex.test(c.version)) &&
      (!lc || lc.some((l) => l.minor == c.minor && l.lifecycle == c.lifecycle)),
  );
}

export function groupChangesets(
  changesets: UnityChangeset[],
  groupMode: GroupMode,
): UnityChangeset[] {
  if (!changesets || changesets.length == 0) return [];

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

const groupBy = <T, K extends string>(arr: T[], key: (i: T) => K) =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

function searchModeToStreams(
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
      throw Error(`The given search mode '${searchMode}' was not supported`);
  }
}

export function getAllChangesetsFromDb(): Promise<UnityChangeset[]> {
  return fetch(UNITY_CHANGESETS_DB_URL)
    .then((res) => {
      if (!res.ok) {
        throw Error(
          `The Unity changeset database could not be fetched: ${res.status} ${res.statusText}`,
        );
      }

      return res.json() as Promise<UnityChangeset[]>;
    });
}

export function searchChangesetsFromDb(
  searchMode: SearchMode,
): Promise<UnityChangeset[]> {
  return getAllChangesetsFromDb()
    .then((changesets: UnityChangeset[]) => {
      if (!changesets || changesets.length == 0) return [];

      const streams = searchModeToStreams(searchMode);
      return searchMode === SearchMode.XLTS
        ? changesets.filter((c) => streams.includes(c.stream))
        : changesets.filter((c) => streams.includes(c.stream) && !c.xlts);
    });
}
