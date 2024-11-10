import { UnityChangeset } from "./unityChangeset.ts";
import { gql, GraphQLClient } from "npm:graphql-request@6.1.0";

const UNITY_GRAPHQL_ENDPOINT: string = "https://services.unity.com/graphql";

export enum UnityReleaseStream {
  LTS = "LTS",
  TECH = "TECH",
  BETA = "BETA",
  ALPHA = "ALPHA",
}

interface UnityReleasesResponse {
  getUnityReleases: {
    totalCount: number;
    edges: { node: { version: string; shortRevision: string } }[];
    pageInfo: { hasNextPage: boolean };
  };
}

export async function getUnityReleases(
  version: string,
  stream: UnityReleaseStream[] = [],
): Promise<UnityChangeset[]> {
  const client = new GraphQLClient(UNITY_GRAPHQL_ENDPOINT);
  const query = gql`
query GetRelease($limit: Int, $skip: Int, $version: String!, $stream: [UnityReleaseStream!])
{
  getUnityReleases(
    limit: $limit
    skip: $skip
    stream: $stream
    version: $version
    entitlements: []
  ) {
    totalCount
    edges {
      node {
        version
        shortRevision
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;
  const variables = {
    limit: 1000,
    skip: 0,
    version: version,
    stream: stream,
  };

  const results: UnityChangeset[] = [];
  while (true) {
    const data: UnityReleasesResponse = await client.request(query, variables);
    results.push(
      ...data.getUnityReleases.edges.map((edge) =>
        new UnityChangeset(edge.node.version, edge.node.shortRevision)
      ),
    );
    if (data.getUnityReleases.pageInfo.hasNextPage === false) {
      break;
    }

    variables.skip += variables.limit;
  }

  return results;
}
