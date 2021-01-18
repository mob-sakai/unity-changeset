#!/usr/bin/env node

const { getUnityChangeset, scrapeArchivedChangesets, scrapeBetaChangesets } = require("../dist/index");
const cli = require('cac')();
const pkgJson = require('../package.json');

const toNumber = function (version, max = false) {
  const match = version.toString().match(/^(\d+)\.*(\d*)\.*(\d*)(\w*)(\d*)$/);
  if (match === null) return 0;

  return parseInt(match[1] || (max ? '9999' : '0')) * 100 * 100 * 100 * 100
    + parseInt(match[2] || (max ? '99' : '0')) * 100 * 100 * 100
    + parseInt(match[3] || (max ? '99' : '0')) * 100 * 100
    + ((match[4] || (max ? 'z' : 'a')).toUpperCase().charCodeAt(0) - 65) * 100
    + parseInt(match[5] || (max ? '99' : '0'));
};

const toMinor = function (version) {
  const match = version.toString().match(/^(\d+)\.*(\d*)\.*(\d*)(\w*)(\d*)$/);
  if (match === null) return '';

  return `${match[1]}.${match[2]}`;
};

const groupBy = (array, getKey) =>
  array.reduce((obj, cur, idx, src) => {
    const key = getKey(cur, idx, src);
    (obj[key] || (obj[key] = [])).push(cur);
    return obj;
  }, {});

cli.command('<version>', 'Get a changeset for specific version')
  .action(version => (async () => {
    try {
      var changeset = await getUnityChangeset(version);
      console.log(changeset.changeset);
    } catch {
      console.error('The given version was not found.');
      process.exit(1);
    }
  })());

cli.command('list', 'List changesets')
  .option('--min <version>', 'Minimum version (included)')
  .option('--max <version>', 'Maximum version (included)')
  .option('--grep <version>', 'Grep version')
  .option('--json', 'Output in json format')
  .option('--pretty-json', 'Output in pretty json format')
  .option('--all', 'List all changesets (alpha/beta included)')
  .option('--beta', 'List alpha/beta changesets')
  .option('--versions', 'Output only the available Unity versions')
  .option('--minor-versions', 'Output only the available Unity minor versions')
  .option('--latest-patch', 'Output only the latest Unity patch versions')
  .action(options => (async () => {
    var results = options.all
      ? (await scrapeArchivedChangesets()).concat(await scrapeBetaChangesets(options.latestPatch))
      : options.beta
        ? await scrapeBetaChangesets(options.latestPatch)
        : await scrapeArchivedChangesets();

    // Filter by min/max.
    var min = options.min ? toNumber(options.min) : Number.MIN_VALUE;
    var max = options.max ? toNumber(options.max, true) : Number.MAX_VALUE;
    results = results
      .filter(r => options.grep ? r.version.includes(options.grep) : true)
      .filter(r => {
        const n = toNumber(r.version);
        return min <= n && n <= max;
      });

    // Group by minor version
    if (options.minorVersions) {
      results.forEach(r => r.version = toMinor(r.version))
      results = Object.values(groupBy(results, r => r.version)).map(g => g[0]);
    }
    // Group by minor version and get latest patch
    else if (options.latestPatch) {
      results = Object.values(groupBy(results, r => toMinor(r.version))).map(g => g[0]);
    }

    // Output versions
    if (options.versions || options.minorVersions)
      results = results.map(r => r.version);

    // Output in json format or plain
    if (options.prettyJson) {
      console.log(JSON.stringify(results, null, '  '));
    }
    else if (options.json) {
      console.log(JSON.stringify(results));
    }
    else {
      console.log(results.map(r => r.toString()).join('\n'));
    }
  })());

cli
  .usage('unity-changeset <command> [options]')
  .example('unity-changeset 2020.1.15f1')
  .example('unity-changeset 2021.1.0a7')
  .example('unity-changeset list')
  .example('unity-changeset list --beta')
  .example('unity-changeset list --versions')
  .help()
  .version(pkgJson.version);

if (process.argv.length < 3) {
  cli.outputHelp(true);
  process.exit(1);
}

cli.parse();