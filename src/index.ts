import fetch, { RequestInfo } from 'node-fetch';
import { JSDOM } from 'jsdom';
import { UnityChangeset } from './unityChangeset';

const UNITY_ARCHIVE_URL = 'https://unity3d.com/get-unity/download/archive';

const getDocumentFromUrl = async (archiveUrl: RequestInfo) => {
  const response = await fetch(archiveUrl);
  const html = await response.text();

  return new JSDOM(html).window.document;
};

export const getUnityChangeset = async (version: string): Promise<UnityChangeset> => {
  const match = version.match(/^\d{4}\.\d+\.\d+(a|b|f)\d+$/);
  switch (match?.[1] as string) {
    case 'f':
      return await getArchivedChangeset(version);
    case 'a':
      return await getBetaChangeset(version, 'alpha');
    case 'b':
      return await getBetaChangeset(version, 'beta');
    default:
      throw Error(`The given life-cycle '${match?.[1]}' (in ${version}) was not supported`)
  }
};

export const getArchivedChangeset = async (version: string): Promise<UnityChangeset> => {
  const versions = await scrapeArchivedChangesets();
  return versions.filter(c => c.version === version)[0];
};

export const getBetaChangeset = async (version: string, channel: string): Promise<UnityChangeset> => {
  const document = await getDocumentFromUrl(`https://unity3d.com/unity/${channel}/${version}`);

  return Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.getAttribute('href') as string)
    .filter(href => UnityChangeset.isValid(href))
    .map(href => UnityChangeset.createFromHref(href))[0];
};

export const scrapeArchivedChangesets = async (): Promise<UnityChangeset[]> => {
  const document = await getDocumentFromUrl(UNITY_ARCHIVE_URL);

  return Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.getAttribute('href') as string)
    .filter(href => UnityChangeset.isValid(href))
    .map(href => UnityChangeset.createFromHref(href));
};

export const scrapeBetaChangesets = async (): Promise<UnityChangeset[]> => {
  const response = await fetch("https://unity3d.com/unity/beta/latest.xml");
  const raw = await response?.text();
  const results = new Set<UnityChangeset>();

  raw
    ?.match(/unityhub:\/\/([^\/]*)\/([0-9a-f]*)/g)
    ?.map(m => m.match(/unityhub:\/\/([^\/]*)\/([0-9a-f]*)/))
    ?.forEach(m => {
      if (m == null) return;
      results.add(new UnityChangeset(m[1], m[2]));
    });

  return Array.from(results);
};

export const toNumber = (version: string, max: boolean): number => {
  return UnityChangeset.toNumber(version, max);
};