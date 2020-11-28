import fetch, { RequestInfo } from 'node-fetch';
import { JSDOM } from 'jsdom';
import { UnityChangeset } from './unityChangeset';

const UNITY_ARCHIVE_URL = 'https://unity3d.com/get-unity/download/archive';
const UNITY_BETA_URL = 'https://unity3d.com/beta';

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
      throw Error('The given version was not supported')
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
  const document = await getDocumentFromUrl(UNITY_BETA_URL);

  const betas = new Set<string>();
  Array.from(document.querySelectorAll('a[href]'))
    .map((a) => a.getAttribute('href') as string)
    .filter((href) => /^\/(alpha|beta)\/\d{4}\.\d(a|b)$/.test(href))
    .forEach((href) => betas.add(href));

  const downloads = new Set<string>();
  for (const beta of betas) {
    // [beta page] e.g. 'https://unity3d.com/beta/2020.2b'
    const betaPage = await getDocumentFromUrl(`https://unity3d.com${beta}`);
    Array.from(betaPage.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') as string)
      // [filter] e.g. '/unity/beta/2020.2.0b13'
      .filter((href) => /^\/unity\/(alpha|beta)\/\d{4}\.\d+\.\d+(a|b)\d+$/.test(href))
      .forEach((href) => downloads.add(href));
  }

  const hrefs = new Set<string>();
  for (const download of downloads) {
    // [download page] e.g. https://unity3d.com/unity/beta/2020.2.0b13
    const downloadPage = await getDocumentFromUrl(`https://unity3d.com${download}`);
    Array.from(downloadPage.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') as string)
      // [filter] e.g. 'unityhub://2020.2.0b13/655e1a328b90'
      .filter((href) => UnityChangeset.isValid(href))
      .forEach((href) => hrefs.add(href));
  }

  return Array.from(hrefs)
    .map(href => UnityChangeset.createFromHref(href));
};