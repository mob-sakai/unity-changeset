import { UnityChangeset as UnityChangesetClass } from "./unityChangeset.ts";

export const UnityChangeset = UnityChangesetClass;
export type UnityChangeset = UnityChangesetClass;

const REGEXP_HUB_LINKS = /unityhub:\/\/\d{4}\.\d+\.\d+(a|b|f)\d+\/\w{12}/g;
const REGEXP_UNITY_VERSION = /\d{4}\.\d+\.\d+(a|b|f)\d+/g;
const UNITY_CHANGESETS_DB_URL =
  "https://mob-sakai.github.io/unity-changeset/db";
const UNITY_RSS_URLS: string[] = [
  "https://unity.com/releases/editor/lts-releases.xml",
  "https://unity.com/releases/editor/tech-and-preview-releases.xml",
  "https://unity.com/releases/editor/beta-releases.xml",
  "https://unity.com/releases/editor/alpha-releases.xml",
];

/*
Unity release URLs for each lifecycle.
*/
const UNITY_RELEASE_URLS: { [key: string]: string } = {
  "p": "https://unity.com/releases/editor/whats-new/",
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
  const db = await loadDb();
  const results = db.filter((c) => c.version === version);
  return results.length > 0
    ? results[0]
    : getUnityChangesetFromReleasePage(version);
}

async function getUnityChangesetFromReleasePage(
  version: string,
): Promise<UnityChangeset> {
  const match = version.match(/^(\d+\.\d+\.\d+)(a|b|f|p)\d+$/);
  const lifecycle = match?.[2] as string;
  const releaseUrl = UNITY_RELEASE_URLS[lifecycle];
  const shortVersion = match?.[1] as string;
  const releasePageUrl = releaseUrl +
    (lifecycle == "f" ? shortVersion : version);
  const response = await fetch(releasePageUrl);
  const text = await response.text();
  const matchLink = text.match(REGEXP_HUB_LINKS);
  if (!matchLink) {
    throw new Error(`No changeset found at '${releasePageUrl}'`);
  }

  const changeset = UnityChangeset.createFromHref(matchLink[0]);
  if (changeset.version !== version) {
    throw new Error(`No changeset found at '${releasePageUrl}'`);
  }

  return changeset;
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

async function loadDb(): Promise<UnityChangeset[]> {
  const response = await fetch(UNITY_CHANGESETS_DB_URL);
  const text = await response.text();
  const lines = text.split("\n");
  return lines
    .map((line) => UnityChangeset.createFromDb(line));
}

async function findVersions(url: string): Promise<string[]> {
  const response = await fetch(url);
  const text = await response.text();
  const lines = text.split("\n");

  const versions = lines
    .map((l) => l.match(REGEXP_UNITY_VERSION))
    .filter((m) => m)
    .map((m) => m?.[0] as string);
  return Array.from(new Set<string>(versions));
}

export async function searchChangesets(
  searchMode: SearchMode,
): Promise<UnityChangeset[]> {
  const results = await loadDb();
  const versions = await Promise.all(UNITY_RSS_URLS
    .map((url) => findVersions(url)));
  const appendResults = await Promise.all(
    versions
      .flat()
      .filter((v) => !results.some((r) => r.version === v))
      .map((v) => getUnityChangesetFromReleasePage(v)),
  );
  const allResults = results.concat(appendResults);

  switch (searchMode) {
    case SearchMode.All:
      return allResults;
    case SearchMode.Default:
      return allResults
        .filter((c) => !c.preRelease);
    case SearchMode.PreRelease:
      return allResults
        .filter((c) => c.preRelease);
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
