import { UnityChangeset as UnityChangesetClass } from "./unityChangeset.ts";

export const UnityChangeset = UnityChangesetClass;
export type UnityChangeset = UnityChangesetClass;

const REGEXP_HUB_LINKS = /unityhub:\/\/\d{4}\.\d+\.\d+(a|b|f)\d+\/\w{12}/g;
const UNITY_ARCHIVE_URL = "https://unity.com/releases/editor/archive";
const UNITY_RSS_URL = "https://unity.com/releases/editor/releases.xml";
const UNITY_BETA_RSS_URL = "https://unity.com/releases/editor/beta/latest.xml";
const UNITY_LTS_RSS_URL = "https://unity.com/releases/editor/lts-releases.xml";

/*
Unity release URLs for each lifecycle.
*/
const UNITY_RELEASE_URLS: { [key: string]: string } = {
  "f": "https://unity.com/releases/editor/whats-new/",
  "a": "https://unity.com/releases/editor/alpha/",
  "b": "https://unity.com/releases/editor/beta/",
};

/*
 * Get an Unity changeset from specific Unity version.
 * @param version The Unity version.
 * @returns An Unity changeset.
 */
export async function getUnityChangeset(
  version: string,
): Promise<UnityChangeset> {
  const match = version.match(/^(\d{4}\.\d+\.\d+)(a|b|f)\d+$/);
  const lifecycle = match?.[2] as string;
  const releaseUrl = UNITY_RELEASE_URLS[lifecycle];

  let results = [];
  if (lifecycle == "f") {
    const shortVersion = match?.[1] as string;
    results = (await getUnityChangesetsFromUrl(releaseUrl + shortVersion))
      .filter((c) => c.version === version);
    if (0 < results.length) return results[0];

    results = (await scrapeArchivedChangesets())
      .filter((c) => c.version === version);
    if (0 < results.length) return results[0];
  } else {
    results = (await getUnityChangesetsFromUrl(releaseUrl + version))
      .filter((c) => c.version === version);
    if (0 < results.length) return results[0];
  }
  
  throw new Error(`No changeset found for '${version}'`);
}

/*
 * Scrape the archived Unity changesets from Unity archives.
 * @returns The Unity changesets.
 */
export function scrapeArchivedChangesets(): Promise<UnityChangeset[]> {
  return Promise.all([
    getUnityChangesetsFromUrl(UNITY_ARCHIVE_URL),
    getUnityChangesetsFromUrl(UNITY_RSS_URL),
    getUnityChangesetsFromUrl(UNITY_LTS_RSS_URL),
  ])
    .then((results) => {
      const changesets = results[0].concat(results[1]);
      const ltsVersons = groupChangesets(results[2], GroupMode.LatestPatch)
        .map((c) => c.minor);
      const unique = new Set();

      return changesets
        .filter((c) => {
          const duplicated = unique.has(c.versionNumber);
          unique.add(c.versionNumber);
          return !duplicated;
        })
        .map((c) => {
          c.lts = ltsVersons.includes(c.minor);
          return c;
        })
        .sort((a, b) => b.versionNumber - a.versionNumber);
    });
}

/*
 * Scrape the alpha/beta Unity changesets from Unity RSS feed.
 * @returns The Unity changesets (alpha/beta).
 */
export function scrapeBetaChangesets(): Promise<UnityChangeset[]> {
  return getUnityChangesetsFromUrl(UNITY_BETA_RSS_URL)
    .then((results) =>
      results.sort((a, b) => b.versionNumber - a.versionNumber)
    );
}

function getUnityChangesetsFromUrl(
  url: string,
): Promise<UnityChangeset[]> {
  return fetch(url)
    .then((response) => response.text())
    .then((raw) => {
      const match = raw.match(REGEXP_HUB_LINKS);

      if (!match) {
        console.error(`No changesets found at '${url}'`);
        return [];
      }

      return match.map((m) => UnityChangeset.createFromHref(m));
    });
}

/*
 * Search mode.
 *
 * All: All the changesets.
 * Archived: Only the archived changesets.
 * PreRelease: Only the alpha/beta changesets.
 */
export enum SearchMode {
  All = 0,
  Archived = 2,
  PreRelease = 3,
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
      return Promise.all([
        scrapeArchivedChangesets(),
        scrapeBetaChangesets(),
      ])
        .then((r) => r.flat());
    case SearchMode.Archived:
      return scrapeArchivedChangesets();
    case SearchMode.PreRelease:
      return scrapeBetaChangesets();
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
