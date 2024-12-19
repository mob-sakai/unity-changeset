// deno-fmt-ignore-file
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/command.ts";
import { resolve } from "https://deno.land/std@0.181.0/path/mod.ts";
import {
  getUnityChangeset,
  listChangesets,
  SearchMode,
  FilterOptions,
  GroupMode,
  OutputMode,
  FormatMode,
} from "./index.ts";

function getPackageVersion(): string {
  try {
    return JSON.parse(Deno.readTextFileSync(
      resolve(new URL(import.meta.url).pathname, "../../package.json"),
    )).version;
  } catch {
    return "-";
  }
}

new Command()
  /*
   * Main command
   */
  .name("unity-changeset")
  .version(getPackageVersion)
  .description("Find Unity changesets.")
  .example("unity-changeset 2018.4.36f1", "Get changeset of Unity 2018.4.36f1 ('6cd387d23174' will be output).")
  .arguments("<version>")
  .action((_, version) => {
    getUnityChangeset(version)
      .then((c) => console.log(c.changeset))
      .catch(() => {
        console.error("The given version was not found.");
        Deno.exit(1);
      });
  })
  /*
   * Sub command: list.
   */
  .command(
    "list",
    new Command()
      .description("List Unity changesets.")
      .example("unity-changeset list", "List changesets.")
      .example("unity-changeset list --all --json", "List changesets of all versions in json format.")
      .example("unity-changeset list --version-only --min 2018.3 --max 2019.4", "List all versions from 2018.3 to 2019.4.")
      .example("unity-changeset list --version-only --grep '(2018.4|2019.4)'", "List all versions in 2018.4 and 2019.4.")
      .example("unity-changeset list --lts --latest-patch", "List changesets of the latest patch versions (LTS only).")
      // Search options.
      .group("Search options")
      .option("--all", "Search all changesets (alpha/beta included)")
      .option("--pre-release, --beta", "Search only pre-release (alpha/beta) changesets", { conflicts: ["all", "lts", "xlts"] })
      .option("--lts", "Only the LTS versions", { conflicts: ["all", "pre-release", "xlts"] })
      .option("--xlts", "Only the LTS/XLTS versions (require 'Enterprise' or 'Industry' license to install XLTS version)", { conflicts: ["all", "pre-release", "lts"] })
      // Filter options.
      .group("Filter options")
      .option("--min <version>", "Minimum version (included)")
      .option("--max <version>", "Maximum version (included)")
      .option("--grep <regex>", "Regular expression (e.g. '20(18|19).4.*')")
      .option("--latest-lifecycle", "Only the latest lifecycle (default)")
      .option("--all-lifecycles", "All lifecycles", { conflicts: ["latest-lifecycle"] })
      // Group options.
      .group("Group options")
      .option("--latest-patch", "The latest patch versions only")
      .option("--oldest-patch", "The oldest patch versions in lateat lifecycle only", { conflicts: ["latest-patch"] })
      // Output options.
      .group("Output options")
      .option("--version-only, --versions", "Outputs only the version (no changesets)")
      .option("--minor-version-only, --minor-versions", "Outputs only the minor version (no changesets)", { conflicts: ["version-only"] })
      .option("--json", "Output in json format")
      .option("--pretty-json", "Output in pretty json format")
      .action((options) => {
        // Search mode.
        const searchMode = options.all
          ? SearchMode.All
          : options.preRelease
            ? SearchMode.PreRelease
            : options.lts
              ? SearchMode.LTS
              : options.xlts
                ? SearchMode.XLTS
                : SearchMode.Default;

        // Group mode.
        const groupMode = (options.latestPatch || options.minorVersionOnly)
          ? GroupMode.LatestPatch
          : options.oldestPatch
            ? GroupMode.OldestPatch
            : GroupMode.All;

        // Filter options.
        const filterOptions: FilterOptions = {
          min: options.min || "",
          max: options.max || "",
          grep: options.grep || "",
          allLifecycles: (options.allLifecycles && !options.latestLifecycle)
            ? true
            : false,
          lts: options.lts || false,
        };

        // Output mode.
        const outputMode = options.versionOnly
          ? OutputMode.VersionOnly
          : options.minorVersionOnly
            ? OutputMode.MinorVersionOnly
            : OutputMode.Changeset;

        // Format mode.
        const formatMode = options.json
          ? FormatMode.Json
          : options.prettyJson
            ? FormatMode.PrettyJson
            : FormatMode.None;

        listChangesets(searchMode, filterOptions, groupMode, outputMode, formatMode)
          .then((result) => console.log(result));
      }),
  )
  /*
   * Run with arguments.
   */
  .parse(Deno.args);
