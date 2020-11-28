#!/usr/bin/env node

const { getUnityChangeset, scrapeArchivedChangesets, scrapeBetaChangesets } = require("../dist/index");
const cli = require('cac')();

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
  .option('-b, --beta', 'List beta changesets')
  .action(options => (async () => {
    var results = options.listBeta
      ? await scrapeArchivedChangesets()
      : await scrapeArchivedChangesets();

    console.log(changesets.map(c => c.toString()).join('\n'));
  })());

cli
  .usage('unity-changeset <command> [options]')
  .example('unity-changeset 2020.1.15f1')
  .example('unity-changeset 2021.1.0a7')
  .example('unity-changeset list')
  .example('unity-changeset list --beta')
  .help()
  .version('1.1.0');

if (process.argv.length < 3) {
  cli.outputHelp(true);
  process.exit(1);
}

cli.parse();