#!/usr/bin/env node

const { getUnityChangeset, scrapeArchivedChangesets, scrapeBetaChangesets } = require("../dist/index");
const cli = require('cac')();

cli.command('[version]', 'Get a changeset for specific version')
  .option('-l, --list', 'List changesets')
  .option('-b, --list-beta', 'List beta changesets')
  .example('unity-changeset 2020.2.14f1')
  .example('unity-changeset --list')
  .example('unity-changeset --list-beta')
  .example('unity-changeset --list --list-beta')
  .action((version, options) => (async () => {
    if (version) {
      try {
        var changeset = await getUnityChangeset(version);
        console.log(changeset.changeset);
      } catch {
        console.error('The given version was not found.');
        process.exit(1);
      }
    }
    else {
      if (process.argv.length < 3) {
        cli.outputHelp();
      }
      if (options.list) {
        var changesets = await scrapeArchivedChangesets();
        console.log(changesets.map(c => c.toString()).join('\n'));
      }
      if (options.listBeta) {
        var changesets = await scrapeBetaChangesets();
        console.log(changesets.map(c => c.toString()).join('\n'));
      }
    }
  })());

cli.help();
cli.version('1.0.0');

cli.parse();