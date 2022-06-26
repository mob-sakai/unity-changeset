import { UnityChangeset } from "./unityChangeset.ts";

const REGEXP_HUB_LINKS = /unityhub:\/\/\d{4}\.\d+\.\d+(a|b|f)\d+\/\w{12}/g;
const UNITY_ARCHIVE_URL = "https://unity3d.com/get-unity/download/archive";
const UNITY_ALPHA_URL = "https://unity3d.com/unity/alpha/";
const UNITY_BETA_URL = "https://unity3d.com/unity/beta/";
const UNITY_RSS_URL = "https://unity3d.com/unity/beta/latest.xml";

/*
* Get an Unity changeset from specific Unity version.
* @param version The Unity version.
* @returns An Unity changeset.
*/
export async function getUnityChangeset(
  version: string,
): Promise<UnityChangeset> {
  const match = version.match(/^\d{4}\.\d+\.\d+(a|b|f)\d+$/);
  const lifecycle = match?.[1] as string;
  switch (lifecycle) {
    case "f":
      return (await getUnityChangesetsFromUrl(UNITY_ARCHIVE_URL))
        .filter((c) => c.version === version)[0];
    case "a":
      return (await getUnityChangesetsFromUrl(UNITY_ALPHA_URL + version))
        .filter((c) => c.version === version)[0];
    case "b":
      return (await getUnityChangesetsFromUrl(UNITY_BETA_URL + version))
        .filter((c) => c.version === version)[0];
    default:
      throw Error(
        `The given life-cycle '${lifecycle}' (in ${version}) was not supported`,
      );
  }
}

/*
* Scrape the archived Unity changesets from Unity archives.
* @returns The Unity changesets.
*/
export function scrapeArchivedChangesets(): Promise<UnityChangeset[]> {
  return getUnityChangesetsFromUrl(UNITY_ARCHIVE_URL);
}

/*
* Scrape the alpha/beta Unity changesets from Unity RSS feed.
* @returns The Unity changesets (alpha/beta).
*/
export function scrapeBetaChangesets(): Promise<UnityChangeset[]> {
  return getUnityChangesetsFromUrl(UNITY_RSS_URL);
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
