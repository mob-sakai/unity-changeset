import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.114.0/testing/asserts.ts";
import { UnityChangeset } from "./unityChangeset.ts";
import {
  getUnityChangeset,
  scrapeArchivedChangesets,
  scrapeBetaChangesets,
} from "./index.ts";

Deno.test("UnityChangeset.toNumber min", () => {
  assertEquals(201803000000, UnityChangeset.toNumber("2018.3", false));
});

Deno.test("UnityChangeset.toNumber max", () => {
  assertEquals(201803992599, UnityChangeset.toNumber("2018.3", true));
});

Deno.test("getUnityChangeset", async () => {
  const changeset = await getUnityChangeset("2018.3.0f2");
  assertEquals("2018.3.0f2\t6e9a27477296", changeset.toString());
});

Deno.test("scrapeArchivedChangesets", async () => {
  const changesets = await scrapeArchivedChangesets();
  assert(0 < changesets.length);
});

Deno.test("scrapeBetaChangesets", async () => {
  const changesets = await scrapeBetaChangesets();
  assert(0 < changesets.length);
});
