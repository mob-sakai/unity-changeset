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

  if (lifecycle == "f") {
    const shortVersion = match?.[1] as string;
    const results = (await getUnityChangesetsFromUrl(releaseUrl + shortVersion))
      .filter((c) => c.version === version);
    if (0 < results.length) return results[0];

    return (await scrapeArchivedChangesets())
      .filter((c) => c.version === version)[0];
  } else {
    return getUnityChangesetsFromUrl(releaseUrl + version)
      .then((results) => results.filter((c) => c.version === version)[0]);
  }
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
  return getUnityChangesetsFromUrl(UNITY_BETA_RSS_URL);
}

async function getUnityChangesetsFromUrl(
  url: string,
): Promise<UnityChangeset[]> {
  const response = await fetch(url);
  const raw = await response.text();
  const match = raw.match(REGEXP_HUB_LINKS);

  if (!match) {
    throw new Error(`No changesets found at '${url}'`);
  }

  return match.map((m) => UnityChangeset.createFromHref(m));
}
