import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: [
    "./src/index.ts",
    {
      kind: "bin",
      name: "unity-changeset",
      path: "./src/cli.ts",
    },
  ],
  outDir: "./npm",
  shims: {
    deno: true, // for Deno namespace
    custom: [{
      package: { // for fetch
        name: "node-fetch",
        version: "~2.6.7",
      },
      globalNames: [{
        name: "fetch",
        exportName: "default",
      }],
    }],
  },
  mappings: {
    "https://unpkg.com/cac@6.7.12/mod.ts": {
      name: "cac",
      version: "6.7.12",
    },
  },
  package: {
    // package.json properties
    name: "unity-changeset",
    version: "0.0.1",
    description: "Get/List Unity changeset",
    author: "mob-sakai <sakai861104@gmail.com>",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/mob-sakai/unity-changeset.git",
    },
    bugs: {
      url: "https://github.com/mob-sakai/unity-changeset/issues",
    },
    engines: {
      node: ">=14",
    },
    devDependencies: {
      "@types/node-fetch": "^2.5.7",
    },
  },
});

// post build steps
Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
Deno.copyFileSync("build/.releaserc.json", "npm/.releaserc.json");
