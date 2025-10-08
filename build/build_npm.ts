import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";

// delete previous build
await emptyDir("./npm");

// build
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
  },
  importMap: "./deno.json",
  // package.json properties
  package: {
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
      node: ">=18",
    },
    dependencies: {
      "graphql": "^16.8.1",
    },
  },
  postBuild() {
    Deno.copyFileSync("LICENSE", "npm/LICENSE");
    Deno.copyFileSync("README.md", "npm/README.md");
    Deno.copyFileSync("build/.releaserc.json", "npm/.releaserc.json");
  },
});
