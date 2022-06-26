// deno-lint-ignore-file no-explicit-any
import { cac } from "https://unpkg.com/cac@6.7.12/mod.ts";
import {
  getUnityChangeset,
  scrapeArchivedChangesets,
  scrapeBetaChangesets,
} from "./index.ts";
import { UnityChangeset } from "./unityChangeset.ts";

interface CliOptions {
  min: string;
  max: string;
  grep: string;
  json: boolean;
  prettyJson: boolean;
  all: boolean;
  beta: boolean;
  versions: boolean;
  minorVersions: boolean;
  latestPatch: boolean;
  oldestPatch: boolean;
  latestLifecycle: boolean;
}

const groupBy = <T, K extends keyof any>(arr: T[], key: (i: T) => K) =>
  arr.reduce((groups, item) => {
    (groups[key(item)] ||= []).push(item);
    return groups;
  }, {} as Record<K, T[]>);

const cli = cac("unity-changeset");
cli.command("<version>", "Get a changeset for specific version")
  .action((version) =>
    (async () => {
      try {
        const changeset = await getUnityChangeset(version);
        console.log(changeset.changeset);
      } catch {
        console.error("The given version was not found.");
        Deno.exit(1);
      }
    })()
  );

cli.command("list", "List changesets")
  .option("--min <version>", "Minimum version (included)")
  .option("--max <version>", "Maximum version (included)")
  .option("--grep <version>", "Grep version")
  .option("--json", "Output in json format")
  .option("--pretty-json", "Output in pretty json format")
  .option("--all", "List all changesets (alpha/beta included)")
  .option("--beta", "List alpha/beta changesets")
  .option("--versions", "Output only the available Unity versions")
  .option("--minor-versions", "Output only the available Unity minor versions")
  .option("--latest-patch", "Output only the latest Unity patch versions")
  .option("--oldest-patch", "Output only the oldest Unity patch versions")
  .option(
    "--latest-lifecycle",
    "Output only the latest lifecycle Unity patch versions",
  )
  .action((options: CliOptions) =>
    (async () => {
      let results = options.all
        ? (await scrapeArchivedChangesets()).concat(
          await scrapeBetaChangesets(),
        )
        : options.beta
        ? await scrapeBetaChangesets()
        : await scrapeArchivedChangesets();

      // Filter by min/max.
      const min = options.min
        ? UnityChangeset.toNumber(options.min, false)
        : Number.MIN_VALUE;
      const max = options.max
        ? UnityChangeset.toNumber(options.max, true)
        : Number.MAX_VALUE;
      results = results
        .filter((r) => options.grep ? r.version.includes(options.grep) : true)
        .filter((r) => min <= r.versionNumber && r.versionNumber <= max);

      // Group by minor version
      if (options.minorVersions) {
        results.forEach((r) => r.version = r.minor);
        results = Object.values(groupBy(results, (r) => r.version)).map((g) =>
          g[0]
        );
      } // Group by minor version and get latest lifecycle patch
      else if (options.latestLifecycle) {
        results = Object.values(groupBy(results, (r) => r.minor))
          .map((g) => g.filter((v) => v.lifecycle == g[0].lifecycle)[0]);
      } // Group by minor version and get latest patch
      else if (options.latestPatch) {
        results = Object.values(groupBy(results, (r) => r.minor)).map((g) =>
          g[0]
        );
      } // Group by minor version and get oldest patch
      else if (options.oldestPatch) {
        results = Object.values(groupBy(results, (r) => r.minor)).map((g) =>
          g[g.length - 1]
        );
      }

      // If the result is empty, do not output anything
      if (results.length == 0) {
        return;
      }

      const res = options.versions || options.minorVersions
        ? results.map((r) => r.version)
        : results;

      // Output in json format or plain
      if (options.prettyJson) {
        console.log(JSON.stringify(res, null, "  "));
      } else if (options.json) {
        console.log(JSON.stringify(res));
      } else {
        console.log(res.map((r) => r.toString()).join("\n"));
      }
    })()
  );

cli
  .usage("unity-changeset <command> [options]")
  .example("unity-changeset 2020.1.15f1")
  .example("unity-changeset 2021.1.0a7")
  .example("unity-changeset list")
  .example("unity-changeset list --beta")
  .example("unity-changeset list --versions")
  .example("unity-changeset list --versions --all")
  .example("unity-changeset list --versions --all --latest-patch")
  .help();

if (0 == Deno.args.length) {
  cli.outputHelp();
  Deno.exit(1);
}

cli.parse();
