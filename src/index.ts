import fetch, { RequestInfo } from 'node-fetch';
import { JSDOM } from 'jsdom';
import { UnityChangeset } from './unityChangeset';

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
    case 'b':
      return await getBetaChangeset(version)
    default:
      throw Error('The given version was not supported')
  }
};

export const getArchivedChangeset = async (version: string): Promise<UnityChangeset> => {
  const versions = await scrapeArchivedChangesets();
  return versions.filter(c => c.version === version)[0];
};

export const getBetaChangeset = async (version: string): Promise<UnityChangeset> => {
  const document = await getDocumentFromUrl(`https://unity3d.com/unity/beta/${version}`);

  return Array.from(document.querySelectorAll('a[href]'))
    .map(a => a.getAttribute('href') as string)
    .filter(href => UnityChangeset.isValid(href))
    .map(href => UnityChangeset.createFromHref(href))[0];
};
