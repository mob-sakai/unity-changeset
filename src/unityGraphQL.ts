import { UnityChangeset } from "./unityChangeset.ts";
import { gql, GraphQLClient } from "npm:graphql-request@6.1.0";

const UNITY_GRAPHQL_ENDPOINT: string = "https://services.unity.com/graphql";

export enum UnityReleaseStream {
  LTS = "LTS",
  TECH = "TECH",
  BETA = "BETA",
  ALPHA = "ALPHA",
}

export enum UnityReleaseEntitlement {
  XLTS = "XLTS",
  U7_ALPHA = "U7_ALPHA",
}

interface UnityReleasesResponse {
  getUnityReleases: {
    totalCount: number;
    edges: { node: { version: string; shortRevision: string; stream: UnityReleaseStream } }[];
    pageInfo: { hasNextPage: boolean };
  };
}

interface UnityReleasesMajorVersionsResponse {
  getUnityReleaseMajorVersions: { version: string; }[];
}

export async function getUnityReleases(
  version: string,
  stream: UnityReleaseStream[] = [],
  entitlements: UnityReleaseEntitlement[] = []
): Promise<UnityChangeset[]> {
  const client = new GraphQLClient(UNITY_GRAPHQL_ENDPOINT);
  const query = gql`
query GetRelease($limit: Int, $skip: Int, $version: String!, $stream: [UnityReleaseStream!], $entitlements: [UnityReleaseEntitlement!])
{
  getUnityReleases(
    limit: $limit
    skip: $skip
    stream: $stream
    version: $version
    entitlements: $entitlements
  ) {
    totalCount
    edges {
      node {
        version
        shortRevision
        stream
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;

  const variables = {
    limit: 500,
    skip: 0,
    version: version,
    stream: stream,
    entitlements: entitlements,
  };

  const results: UnityChangeset[] = [];
  while (true) {
    const data: UnityReleasesResponse = await client.request(query, variables);
    results.push(
      ...data.getUnityReleases.edges.map((edge) =>
        new UnityChangeset(edge.node.version, edge.node.shortRevision, edge.node.stream == UnityReleaseStream.LTS)
      ),
    );
    if (data.getUnityReleases.pageInfo.hasNextPage === false) {
      break;
    }

    variables.skip += variables.limit;
  }

  return results;
}

export async function getUnityReleasesInLTS(
  entitlements: UnityReleaseEntitlement[] = [],
): Promise<UnityChangeset[]> {
  const client = new GraphQLClient(UNITY_GRAPHQL_ENDPOINT);
  const query = gql`
query GetReleaseMajorVersions($entitlements: [UnityReleaseEntitlement!])
{
  getUnityReleaseMajorVersions(
    stream: []
    platform: []
    architecture: []
    entitlements: $entitlements
  ) {
    version
  }
}
`;

  const variables = {
    entitlements: entitlements,
  };

  const data: UnityReleasesMajorVersionsResponse = await client.request(query, variables);
  const results = await Promise.all(data.getUnityReleaseMajorVersions
    .map(async (v) => {
      return await getUnityReleases(v.version, [UnityReleaseStream.LTS], entitlements);
    }));

  return results.flat();
}
