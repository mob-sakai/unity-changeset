// deno-fmt-ignore-file
import {
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "https://deno.land/std@0.181.0/testing/asserts.ts";
import {
  filterChangesets,
  getUnityChangeset,
  groupChangesets,
  GroupMode,
  scrapeArchivedChangesets,
  scrapeBetaChangesets,
  searchChangesets,
  SearchMode,
  UnityChangeset,
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
].forEach((testcase) => {
  Deno.test(`getUnityChangeset (${testcase.version})`, async () => {
    if (testcase.expected) {
      const changeset = (await getUnityChangeset(testcase.version)).changeset;
      assertEquals(changeset, testcase.expected);
    }
    else
    {
      await assertRejects(() => getUnityChangeset(testcase.version));
    }
  })
});

Deno.test("scrapeArchivedChangesets", async () => {
  const changesets = await scrapeArchivedChangesets();
  assertNotEquals(changesets.length, 0);
});

Deno.test("scrapeBetaChangesets", async () => {
  const changesets = await scrapeBetaChangesets();
  console.log(changesets.map((c) => c.version));
  assertNotEquals(changesets.length, 0);
});

// searchChangesets
[
  { searchMode: SearchMode.All        },
  { searchMode: SearchMode.Archived   },
  { searchMode: SearchMode.PreRelease },
].forEach((testcase) => {
  Deno.test(`filterChangesets(${JSON.stringify(testcase.searchMode)})`, async () => {
    const changesets = await searchChangesets(SearchMode.All);
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
  new UnityChangeset("2018.4.0f1", "000000000000", true),
  new UnityChangeset("2018.4.1f1", "000000000000", true),
  new UnityChangeset("2018.4.2f1", "000000000000", true),
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
  { options: { min: "2018.3", max: "2018.4", grep: "",     allLifecycles: false, lts: false, }, expected: 6,  },
  { options: { min: "2018.3", max: "",       grep: "2018", allLifecycles: false, lts: false, }, expected: 6,  },
  { options: { min: "",       max: "",       grep: "",     allLifecycles: false, lts: true   }, expected: 3,  },
  { options: { min: "2019",   max: "",       grep: "",     allLifecycles: true,  lts: false, }, expected: 13, },
  { options: { min: "2019",   max: "",       grep: "b",    allLifecycles: true,  lts: false, }, expected: 4,  },
].forEach((testcase) => {
  Deno.test(`filterChangesets(${JSON.stringify(testcase.options)})`, () => {
    const changesets = filterChangesets(changesetsForTest, testcase.options);
    console.log(changesets.map((c) => `${c.version}`));
    assertEquals(changesets.length, testcase.expected);
  });
});

// groupChangesets
[
  { groupMode: GroupMode.All,             expected: 22 },
  { groupMode: GroupMode.LatestLifecycle, expected: 14 },
  { groupMode: GroupMode.LatestPatch,     expected: 5  },
  { groupMode: GroupMode.OldestPatch,     expected: 5  },
].forEach((testcase) => {
  Deno.test(`groupChangesets(${testcase.groupMode})`, () => {
    const changesets = groupChangesets(changesetsForTest, testcase.groupMode);
    console.log(changesets.map((c) => `${c.version}`));
    assertEquals(changesets.length, testcase.expected);
  });
});
