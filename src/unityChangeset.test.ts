// deno-fmt-ignore-file
import {
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "std/testing/asserts";
import {
  filterChangesets,
  getUnityChangeset,
  groupChangesets,
  searchChangesets,
  searchChangesetsFromDb,
  GroupMode,
  SearchMode,
  UnityChangeset,
  UnityReleaseStream,
} from "./index.ts";

Deno.test("UnityChangeset.toNumber min", () => {
  assertEquals(UnityChangeset.toNumber("2018.3", false), 201803000000);
});

Deno.test("UnityChangeset.toNumber max", () => {
  assertEquals(UnityChangeset.toNumber("2018.3", true), 201803992599);
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
  const changesets = await searchChangesets(SearchMode.SUPPORTED);
  assertNotEquals(changesets.length, 0);

  const unity6000 = changesets.find(c => c.version.startsWith("6000"));
  assertNotEquals(unity6000, undefined);
});

// searchChangesets
[
  { searchMode: SearchMode.All },
  { searchMode: SearchMode.Default },
  { searchMode: SearchMode.PreRelease },
  { searchMode: SearchMode.SUPPORTED },
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
  new UnityChangeset("2018.4.2f1", "000000000000", UnityReleaseStream.LTS),
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
  { options: { min: "2018.3", max: "2018.4", grep: "", allLifecycles: false, lts: false, }, expected: 6, },
  { options: { min: "2018.3", max: "", grep: "2018", allLifecycles: false, lts: false, }, expected: 6, },
  { options: { min: "", max: "", grep: "", allLifecycles: false, lts: true }, expected: 3, },
  { options: { min: "2019", max: "", grep: "", allLifecycles: true, lts: false, }, expected: 13, },
  { options: { min: "2019", max: "", grep: "b", allLifecycles: true, lts: false, }, expected: 4, },
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
  const changesets = await searchChangesetsFromDb(SearchMode.Default);
  assertNotEquals(changesets.length, 0);
});
