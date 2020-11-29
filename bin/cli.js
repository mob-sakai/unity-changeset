#!/usr/bin/env node

const { getUnityChangeset, scrapeArchivedChangesets, scrapeBetaChangesets } = require("../dist/index");
const cli = require('cac')();

toNumber = function (version) {
  const match = version.toString().match(/^(\d+)\.*(\d*)\.*(\d*)(\w*)(\d*)$/);
  if (match === null) return 0;

  return parseInt(match[1] || '0') * 100 * 100 * 100 * 100
    + parseInt(match[2] || '0') * 100 * 100 * 100
    + parseInt(match[3] || '0') * 100 * 100
    + ((match[4] || 'a').toUpperCase().charCodeAt(0) - 65) * 100
    + parseInt(match[5] || '0');
};

cli.command('<version>', 'Get a changeset for specific version')
  .action((version, options) => (async () => {
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
  .option('--json', 'Output in json format')
  .option('--all', 'List all changesets (alpha/beta included)')
  .option('--beta', 'List alpha/beta changesets')
  .option('--versions', 'Output only the available unity version')
  .action(options => (async () => {
    var results = options.all
      ? (await scrapeArchivedChangesets()).concat(await scrapeBetaChangesets())
      : options.beta
        ? await scrapeBetaChangesets()
        : await scrapeArchivedChangesets();

    // Filter by min/max.
    var min = options.min ? toNumber(options.min) : Number.MIN_VALUE;
    var max = options.max ? toNumber(options.max) : Number.MAX_VALUE;
    results = results.filter(r => {
      const n = toNumber(r.version);
      return min <= n && n <= max;
    });

    if (options.json) {
      if (options.versions)
        console.log(JSON.stringify(results.map(r => r.version)));
      else
        console.log(JSON.stringify(results));
    }
    else {
      if (options.versions)
        console.log(results.map(r => r.version).join('\n'));
      else
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
  .version('1.1.0');

if (process.argv.length < 3) {
  cli.outputHelp(true);
  process.exit(1);
}

cli.parse();