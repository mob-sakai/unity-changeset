import {
  UnityChangeset,
  UnityReleaseEntitlement,
  UnityReleaseStream,
} from "./unityChangeset.ts";
import { ClientError, gql, GraphQLClient } from "graphql-request";

const UNITY_GRAPHQL_ENDPOINT: string = "https://services.unity.com/graphql";

// Cache for API responses
const cache = new Map<
  string,
  {
    data: UnityReleasesResponse | UnityReleasesMajorVersionsResponse;
    timestamp: number;
  }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface UnityReleasesResponse {
  getUnityReleases: {
    totalCount: number;
    edges: {
      node: {
        version: string;
        shortRevision: string;
        stream: UnityReleaseStream;
        entitlements: UnityReleaseEntitlement[];
      };
    }[];
    pageInfo: { hasNextPage: boolean };
  };
}

interface UnityReleasesMajorVersionsResponse {
  getUnityReleaseMajorVersions: { version: string }[];
}

// Helper function to get cache key
function getCacheKey(
  query: string,
  variables: Record<string, unknown>,
): string {
  return JSON.stringify({ query, variables });
}

// Helper function to check if cache is valid
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

// Enhanced error handling for GraphQL requests
async function requestWithErrorHandling<T>(
  client: GraphQLClient,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  try {
    const response = await client.request<T>(query, variables);
    return response;
  } catch (error: unknown) {
    if (error instanceof ClientError) {
      if (error.response?.errors) {
        const graphQLErrors = error.response.errors.map((e) => e.message).join(
          ", ",
        );
        throw new Error(`GraphQL API error: ${graphQLErrors}`);
      } else if (error.response?.status) {
        throw new Error(
          `HTTP error: ${error.response.status} ${error.response.statusText}`,
        );
      }
    }
    if (
      error instanceof Error &&
      (error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND"))
    ) {
      throw new Error(
        `Network error: Unable to connect to Unity GraphQL API. Please check your internet connection.`,
      );
    }
    throw new Error(
      `Unexpected error: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`,
    );
  }
}

export async function getUnityReleases(
  version: string,
  stream: UnityReleaseStream[] = [],
  entitlements: UnityReleaseEntitlement[] = [],
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
        entitlements
      }
    }
    pageInfo {
      hasNextPage
    }
  }
}
`;

  const variables = {
    limit: 250,
    skip: 0,
    version: version,
    stream: stream,
    entitlements: entitlements,
  };

  const results: UnityChangeset[] = [];
  while (true) {
    const cacheKey = getCacheKey(query, variables);
    let data: UnityReleasesResponse;

    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached.timestamp)) {
      data = cached.data as UnityReleasesResponse;
    } else {
      data = await requestWithErrorHandling<UnityReleasesResponse>(
        client,
        query,
        variables,
      );
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    if (!data.getUnityReleases || !data.getUnityReleases.edges) {
      throw new Error(
        "Invalid response from Unity GraphQL API: missing getUnityReleases.edges",
      );
    }

    results.push(
      ...data.getUnityReleases.edges.map((edge) => {
        if (!edge.node) {
          throw new Error(
            "Invalid response from Unity GraphQL API: missing edge.node",
          );
        }
        return new UnityChangeset(
          edge.node.version,
          edge.node.shortRevision,
          edge.node.stream,
          edge.node.entitlements,
        );
      }),
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

  const cacheKey = getCacheKey(query, variables);
  let data: UnityReleasesMajorVersionsResponse;

  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    data = cached.data as UnityReleasesMajorVersionsResponse;
  } else {
    data = await requestWithErrorHandling<UnityReleasesMajorVersionsResponse>(
      client,
      query,
      variables,
    );
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  if (!data.getUnityReleaseMajorVersions) {
    throw new Error(
      "Invalid response from Unity GraphQL API: missing getUnityReleaseMajorVersions",
    );
  }

  const results = await Promise.all(data.getUnityReleaseMajorVersions
    .map(async (v) => {
      if (!v.version) {
        throw new Error(
          "Invalid response from Unity GraphQL API: missing version in major versions",
        );
      }
      return await getUnityReleases(
        v.version,
        [UnityReleaseStream.LTS],
        entitlements,
      );
    }));

  return results.flat();
}
