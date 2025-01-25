import { UnityChangeset as UnityChangesetClass } from "./unityChangeset.ts";
import { getUnityReleases, getUnityReleasesInLTS, UnityReleaseEntitlement, UnityReleaseStream } from "./unityGraphQL.ts";

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
  const changesets = (await getUnityReleases(version, []))
    .filter((c) => c.version === version);
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

export function searchChangesets(
  searchMode: SearchMode,
): Promise<UnityChangeset[]> {
  switch (searchMode) {
    case SearchMode.All:
      return getUnityReleases(".", [
        UnityReleaseStream.LTS,
        UnityReleaseStream.TECH,
        UnityReleaseStream.BETA,
        UnityReleaseStream.ALPHA,
      ]);
    case SearchMode.Default:
      return getUnityReleases(".", [
        UnityReleaseStream.LTS,
        UnityReleaseStream.TECH,
      ]);
    case SearchMode.PreRelease:
      return getUnityReleases(".", [
        UnityReleaseStream.BETA,
        UnityReleaseStream.ALPHA,
      ]);
    case SearchMode.LTS:
      return getUnityReleasesInLTS();
    case SearchMode.XLTS:
      return getUnityReleasesInLTS([UnityReleaseEntitlement.XLTS]);
    default:
      throw Error(`The given search mode '${searchMode}' was not supported`);
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
    : Object.values(groupBy(changesets, (r) => r.minor))
      .map((g) => g[0]);

  return changesets
    .filter((c) =>
      min <= c.versionNumber &&
      c.versionNumber <= max &&
      (!options.lts || c.lts) &&
      (!regex || regex.test(c.version)) &&
      (!lc || lc.some((l) => l.minor == c.minor && l.lifecycle == c.lifecycle))
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
      return Object.values(groupBy(changesets, (r) => r.minor))
        .map((g) => g[0]);
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
