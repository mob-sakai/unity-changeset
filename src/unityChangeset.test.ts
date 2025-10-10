// deno-fmt-ignore-file
import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "std/testing/asserts";
import {
  filterChangesets,
  getUnityChangeset,
  groupChangesets,
  listChangesets,
  searchChangesets,
  searchChangesetsFromDb,
  GroupMode,
  OutputMode,
  FormatMode,
  SearchMode,
  UnityChangeset,
  UnityReleaseEntitlement,
  UnityReleaseStream,
} from "./index.ts";
import { searchModeToStreams, sanitizeVersion, validateFilterOptions, groupBy } from "./utils.ts";

Deno.test("UnityChangeset.toNumber min", () => {
  assertEquals(UnityChangeset.toNumber("2018.3", false), 201803000000);
});

Deno.test("UnityChangeset.toNumber max", () => {
  assertEquals(UnityChangeset.toNumber("2018.3", true), 201803992599);
});

Deno.test("UnityChangeset constructor", () => {
  const changeset = new UnityChangeset("2018.3.0f1", "abc123");
  assertEquals(changeset.version, "2018.3.0f1");
  assertEquals(changeset.changeset, "abc123");
  assertEquals(changeset.stream, UnityReleaseStream.UNDEFINED);
  assertEquals(changeset.entitlements, []);
  assertEquals(changeset.lts, false);
  assertEquals(changeset.xlts, false);
});

Deno.test("UnityChangeset constructor with LTS", () => {
  const changeset = new UnityChangeset("2018.4.0f1", "abc123", UnityReleaseStream.LTS);
  assertEquals(changeset.stream, UnityReleaseStream.LTS);
  assertEquals(changeset.lts, true);
  assertEquals(changeset.xlts, false);
});

Deno.test("UnityChangeset constructor with XLTS", () => {
  const changeset = new UnityChangeset("2018.4.0f1", "abc123", UnityReleaseStream.LTS, [UnityReleaseEntitlement.XLTS]);
  assertEquals(changeset.stream, UnityReleaseStream.LTS);
  assertEquals(changeset.lts, true);
  assertEquals(changeset.xlts, true);
  assertEquals(changeset.entitlements, [UnityReleaseEntitlement.XLTS]);
});

Deno.test("UnityChangeset constructor errors", () => {
  assertThrows(() => new UnityChangeset("", "abc123"), Error, "Version must be a non-empty string");
  assertThrows(() => new UnityChangeset("2018.3.0f1", ""), Error, "Changeset must be a non-empty string");
  assertThrows(() => new UnityChangeset("2018.3.0f1", "abc123", UnityReleaseStream.LTS, "invalid" as unknown as UnityReleaseEntitlement[]), Error, "Entitlements must be an array");
});

Deno.test("UnityChangeset.toString", () => {
  const changeset = new UnityChangeset("2018.3.0f1", "abc123");
  assertEquals(changeset.toString(), "2018.3.0f1\tabc123");
});

// getUnityChangeset
[
  { version: "2018.3.0f1", expected: "f023c421e164" },
  { version: "2018.3.0f2", expected: "6e9a27477296" },
  { version: "2018.3.0f3", expected: undefined },
  { version: "2019.1.0a9", expected: "0acd256790e8" },
  { version: "2019.1.0b1", expected: "83b3ba1f99df" },
  { version: "6000.1.0f1", expected: "9ea152932a88" },
].forEach((testcase) => {
  Deno.test(`getUnityChangeset (${testcase.version})`, async () => {
    if (testcase.expected) {
      const changeset = (await getUnityChangeset(testcase.version)).changeset;
      assertEquals(changeset, testcase.expected);
    }
    else {
      await assertRejects(() => getUnityChangeset(testcase.version));
    }
  })
});

Deno.test("scrapeArchivedChangesets", async () => {
  const changesets = await searchChangesets(SearchMode.Default);
  assertNotEquals(changesets.length, 0);
});

Deno.test("scrapeBetaChangesets", async () => {
  const changesets = await searchChangesets(SearchMode.PreRelease);
  assertNotEquals(changesets.length, 0);
});

// At least one changeset from unity 6000 version should be found.
Deno.test("scrapeUnity6000Supported", async () => {
  const changesets = await searchChangesets(SearchMode.Supported);
  assertNotEquals(changesets.length, 0);

  const unity6000 = changesets.find(c => c.version.startsWith("6000"));
  assertNotEquals(unity6000, undefined);
});

// searchChangesets
[
  { searchMode: SearchMode.All },
  { searchMode: SearchMode.Default },
  { searchMode: SearchMode.PreRelease },
  { searchMode: SearchMode.Supported },
].forEach((testcase) => {
  Deno.test(`filterChangesets(${JSON.stringify(testcase.searchMode)})`, async () => {
    const changesets = await searchChangesets(testcase.searchMode);
    assertNotEquals(changesets.length, 0);
  });
});

const changesetsForTest = [
  new UnityChangeset("2018.2.0f1", "000000000000"),
  new UnityChangeset("2018.2.1f1", "000000000000"),
  new UnityChangeset("2018.2.2f1", "000000000000"),
  new UnityChangeset("2018.3.0f1", "000000000000"),
  new UnityChangeset("2018.3.1f1", "000000000000"),
  new UnityChangeset("2018.3.2f1", "000000000000"),
  new UnityChangeset("2018.4.0f1", "000000000000", UnityReleaseStream.LTS),
  new UnityChangeset("2018.4.1f1", "000000000000", UnityReleaseStream.LTS),
  new UnityChangeset("2018.4.2f1", "000000000000", UnityReleaseStream.LTS, [UnityReleaseEntitlement.XLTS]),
  new UnityChangeset("2019.1.0a1", "000000000000"),
  new UnityChangeset("2019.1.0a2", "000000000000"),
  new UnityChangeset("2019.1.0b1", "000000000000"),
  new UnityChangeset("2019.1.0b2", "000000000000"),
  new UnityChangeset("2019.1.0f1", "000000000000"),
  new UnityChangeset("2019.1.0f2", "000000000000"),
  new UnityChangeset("2019.1.1f1", "000000000000"),
  new UnityChangeset("2019.2.0a1", "000000000000"),
  new UnityChangeset("2019.2.0a2", "000000000000"),
  new UnityChangeset("2019.2.0b1", "000000000000"),
  new UnityChangeset("2019.2.0b2", "000000000000"),
  new UnityChangeset("2019.2.0a1", "000000000000"),
  new UnityChangeset("2019.2.0a2", "000000000000"),
].sort((a, b) => b.versionNumber - a.versionNumber);

// filterChangesets
[
  { options: { min: "2018.3", max: "2018.4", grep: "", allLifecycles: false, xlts: false, }, expected: 5, },
  { options: { min: "2018.3", max: "", grep: "2018", allLifecycles: false, xlts: false, }, expected: 5, },
  { options: { min: "2019", max: "", grep: "", allLifecycles: true, xlts: false, }, expected: 13, },
  { options: { min: "2019", max: "", grep: "b", allLifecycles: true, xlts: false, }, expected: 4, },
  { options: { min: "", max: "", grep: "", allLifecycles: false, xlts: true, }, expected: 14, },
  { options: { min: "", max: "", grep: "2018", allLifecycles: false, xlts: false, }, expected: 8, },
].forEach((testcase) => {
  Deno.test(`filterChangesets(${JSON.stringify(testcase.options)})`, () => {
    const changesets = filterChangesets(changesetsForTest, testcase.options);
    assertEquals(changesets.length, testcase.expected);
  });
});

// groupChangesets
[
  { groupMode: GroupMode.All, expected: 22 },
  { groupMode: GroupMode.LatestLifecycle, expected: 14 },
  { groupMode: GroupMode.LatestPatch, expected: 5 },
  { groupMode: GroupMode.OldestPatch, expected: 5 },
].forEach((testcase) => {
  Deno.test(`groupChangesets(${testcase.groupMode})`, () => {
    const changesets = groupChangesets(changesetsForTest, testcase.groupMode);
    assertEquals(changesets.length, testcase.expected);
  });
});

Deno.test("scrapeArchivedChangesetsFromDb", async () => {
  const changesets = await searchChangesetsFromDb(searchModeToStreams(SearchMode.Default));
  assertNotEquals(changesets.length, 0);
});

Deno.test("listChangesets", async () => {
  const result = await listChangesets(
    SearchMode.Default,
    { min: "", max: "", grep: "", allLifecycles: false, xlts: false },
    GroupMode.All,
    OutputMode.Changeset,
    FormatMode.Json,
  );
  assertNotEquals(result.length, 0);
  // Should be valid JSON
  JSON.parse(result);
});

Deno.test("searchModeToStreams", () => {
  assertEquals(searchModeToStreams(SearchMode.All), [
    UnityReleaseStream.LTS,
    UnityReleaseStream.SUPPORTED,
    UnityReleaseStream.TECH,
    UnityReleaseStream.BETA,
    UnityReleaseStream.ALPHA,
  ]);
  assertEquals(searchModeToStreams(SearchMode.Default), [
    UnityReleaseStream.LTS,
    UnityReleaseStream.SUPPORTED,
    UnityReleaseStream.TECH,
  ]);
  assertEquals(searchModeToStreams(SearchMode.PreRelease), [
    UnityReleaseStream.ALPHA,
    UnityReleaseStream.BETA,
  ]);
  assertEquals(searchModeToStreams(SearchMode.LTS), [
    UnityReleaseStream.LTS,
  ]);
  assertEquals(searchModeToStreams(SearchMode.Supported), [
    UnityReleaseStream.SUPPORTED,
  ]);
});

Deno.test("sanitizeVersion", () => {
  assertEquals(sanitizeVersion("2018.3.0f1"), "2018.3.0f1");
  assertEquals(sanitizeVersion("2019.1.0a9"), "2019.1.0a9");
  assertThrows(() => sanitizeVersion("2018.3<script>"), Error, "Version contains invalid characters");
  assertThrows(() => sanitizeVersion(123 as unknown as string), Error, "Version must be a string");
});

Deno.test("validateFilterOptions", () => {
  // Valid options
  validateFilterOptions({ min: "2018.3", max: "2019.1", grep: "2018" });
  validateFilterOptions({});

  // Invalid types
  assertThrows(() => validateFilterOptions({ min: 123 as unknown as string }), Error, "Min version must be a string");
  assertThrows(() => validateFilterOptions({ max: 123 as unknown as string }), Error, "Max version must be a string");
  assertThrows(() => validateFilterOptions({ grep: 123 as unknown as string }), Error, "Grep pattern must be a string");

  // Invalid regex
  assertThrows(() => validateFilterOptions({ grep: "[invalid" }), Error, "Invalid grep pattern");
});

Deno.test("groupBy", () => {
  const items = [
    { id: 1, category: "A" },
    { id: 2, category: "B" },
    { id: 3, category: "A" },
  ];
  const grouped = groupBy(items, (item) => item.category);
  assertEquals(grouped, {
    A: [{ id: 1, category: "A" }, { id: 3, category: "A" }],
    B: [{ id: 2, category: "B" }],
  });
});
