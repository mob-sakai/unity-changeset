import {
  UnityChangeset,
  UnityReleaseEntitlement,
  UnityReleaseStream,
} from "./unityChangeset.ts";
import { sanitizeVersion } from "./utils.ts";

// Centralize the Unity public API and RSS feed endpoints here.
const UNITY_RELEASE_API_URL =
  "https://services.api.unity.com/unity/editor/release/v1/releases?limit=25";
const UNITY_RSS_FEEDS: {
  url: string;
  stream: UnityReleaseStream;
  xlts: boolean;
}[] = [
  {
    url: "https://unity.com/releases/editor/lts-releases.xml",
    stream: UnityReleaseStream.LTS,
    xlts: true,
  },
  {
    url: "https://unity.com/releases/editor/tech-and-preview-releases.xml",
    stream: UnityReleaseStream.TECH,
    xlts: false,
  },
  {
    url: "https://unity.com/releases/editor/beta-releases.xml",
    stream: UnityReleaseStream.BETA,
    xlts: false,
  },
  {
    url: "https://unity.com/releases/editor/alpha-releases.xml",
    stream: UnityReleaseStream.ALPHA,
    xlts: false,
  },
];

type UnityReleaseApiResponse = {
  results?: {
    unityHubDeepLink?: string;
    stream?: UnityReleaseStream;
  }[];
};

type UnityRssItem = {
  title: string;
  link: string;
  stream: UnityReleaseStream;
  xlts: boolean;
};

const REGEXP_UNITY_HUB_DEEPLINK = /unityhub:\/\/([^/]+)\/([^/?#\s<"'>]+)/i;
const REGEXP_UNITY_RELEASE_VERSION =
  /Unity\s+([0-9]+\.[0-9]+\.[0-9]+[a-zA-Z]+\d+)/i;
const REGEXP_RSS_ITEM = /<item>([\s\S]*?)<\/item>/gi;
const REGEXP_RSS_LINK = /<link>([^<]+)<\/link>/i;
const REGEXP_RSS_TITLE = /<title><!\[CDATA\[([^\]]+)\]\]><\/title>/i;

const UNITY_BROWSER_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
};

export async function mergeExternalChangesets(
  baseChangesets: UnityChangeset[],
  streams: UnityReleaseStream[],
): Promise<UnityChangeset[]> {
  // Do not add versions that already exist in the base dataset.
  const seen = new Set(baseChangesets.map((changeset) => changeset.version));

  const apiChangesets = await collectBestEffortChangesets(() => {
    return getChangesetsFromUnityReleaseApi(streams, seen);
  });
  for (const changeset of apiChangesets) {
    seen.add(changeset.version);
  }
  const rssChangesets = await collectBestEffortChangesets(() => {
    return getChangesetsFromUnityRssFeeds(streams, seen);
  });

  return [...rssChangesets, ...apiChangesets, ...baseChangesets];
}

async function collectBestEffortChangesets(
  loader: () => Promise<UnityChangeset[]>,
): Promise<UnityChangeset[]> {
  // Do not fail the whole flow because one external source failed.
  try {
    return await loader();
  } catch {
    return [];
  }
}

async function getChangesetsFromUnityReleaseApi(
  streams: UnityReleaseStream[],
  ignoredVersions: Set<string>,
): Promise<UnityChangeset[]> {
  const response = await fetch(UNITY_RELEASE_API_URL, {
    headers: UNITY_BROWSER_HEADERS,
  });
  if (!response.ok) {
    await response.text();
    throw new Error(
      `Failed to fetch Unity release API: ${response.status} ${response.statusText}`,
    );
  }

  // Build version and changeset directly from the API deep link.
  const data = await response.json() as UnityReleaseApiResponse;
  const results = Array.isArray(data.results) ? data.results : [];

  return results.flatMap((result) => {
    // Skip streams that are not part of the current search.
    if (!result.stream || !streams.includes(result.stream)) {
      return [];
    }

    // Extract version and changeset from the deep link.
    const parsed = parseUnityHubDeepLink(result.unityHubDeepLink);
    if (!parsed || ignoredVersions.has(parsed.version)) {
      return [];
    }

    ignoredVersions.add(parsed.version);

    return [
      new UnityChangeset(
        parsed.version,
        parsed.changeset,
        result.stream,
        [],
      ),
    ];
  });
}

async function getChangesetsFromUnityRssFeeds(
  streams: UnityReleaseStream[],
  ignoredVersions: Set<string>,
): Promise<UnityChangeset[]> {
  const results: UnityChangeset[] = [];

  // Follow each RSS feed to its release pages and recover unityhub:// from the page content.
  for (const feed of UNITY_RSS_FEEDS) {
    // Skip feeds that do not match the caller's search mode.
    if (!streams.includes(feed.stream)) {
      continue;
    }

    const response = await fetch(feed.url, {
      headers: UNITY_BROWSER_HEADERS,
    });
    if (!response.ok) {
      await response.text();
      throw new Error(
        `Failed to fetch Unity RSS feed: ${response.status} ${response.statusText}`,
      );
    }

    const items = parseUnityRssItems(
      await response.text(),
      feed.stream,
      feed.xlts,
    );
    for (const item of items) {
      const version = parseVersionFromRssTitle(item.title);
      if (!version || ignoredVersions.has(version)) {
        continue;
      }

      // Check the release page body for unityhub://{version}/{changeset}.
      const releasePage = await fetch(item.link, {
        headers: UNITY_BROWSER_HEADERS,
      });
      if (!releasePage.ok) {
        await releasePage.text();
        continue;
      }

      const parsed = extractChangesetFromReleasePage(
        await releasePage.text(),
        item.title,
      );
      if (!parsed) {
        continue;
      }

      ignoredVersions.add(parsed.version);

      results.push(
        new UnityChangeset(
          parsed.version,
          parsed.changeset,
          item.stream,
          item.xlts ? [UnityReleaseEntitlement.XLTS] : [],
        ),
      );
    }
  }

  return results;
}

function parseUnityHubDeepLink(
  deepLink?: string,
): { version: string; changeset: string } | null {
  if (!deepLink) {
    return null;
  }

  // Split unityhub://{version}/{changeset} into its parts.
  const match = deepLink.match(REGEXP_UNITY_HUB_DEEPLINK);
  if (!match) {
    return null;
  }

  return {
    version: sanitizeVersion(match[1]),
    changeset: match[2],
  };
}

function parseVersionFromRssTitle(title: string): string | null {
  const match = title.match(REGEXP_UNITY_RELEASE_VERSION);
  if (!match) {
    return null;
  }

  return sanitizeVersion(match[1]);
}

function parseUnityRssItems(
  xml: string,
  stream: UnityReleaseStream,
  xlts: boolean,
): UnityRssItem[] {
  const items: UnityRssItem[] = [];

  // Walk the XML minimally and extract the link and title from each item.
  for (const match of xml.matchAll(REGEXP_RSS_ITEM)) {
    const block = match[1];
    const titleMatch = block.match(REGEXP_RSS_TITLE);
    const linkMatch = block.match(REGEXP_RSS_LINK);

    if (!titleMatch || !linkMatch) {
      continue;
    }

    // Keep only the fields needed from each RSS item.
    items.push({
      title: titleMatch[1].trim(),
      link: linkMatch[1].trim(),
      stream,
      xlts,
    });
  }

  return items;
}

function extractChangesetFromReleasePage(
  pageText: string,
  title: string,
): { version: string; changeset: string } | null {
  // Ensure the title and the deep link point to the same version.
  const versionMatch = title.match(REGEXP_UNITY_RELEASE_VERSION);
  const deepLinkMatch = pageText.match(REGEXP_UNITY_HUB_DEEPLINK);

  if (!versionMatch || !deepLinkMatch) {
    return null;
  }

  const version = sanitizeVersion(versionMatch[1]);
  const deepLinkVersion = sanitizeVersion(deepLinkMatch[1]);
  if (version !== deepLinkVersion) {
    return null;
  }

  return {
    version,
    changeset: deepLinkMatch[2],
  };
}
