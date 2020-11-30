unity-changeset
===

Get/List Unity editor changeset

[![npm](https://img.shields.io/npm/v/unity-changeset)](https://www.npmjs.com/package/unity-changeset)
![license](https://img.shields.io/npm/l/unity-changeset)
![downloads](https://img.shields.io/npm/dy/unity-changeset)
![release](https://github.com/mob-sakai/unity-changeset/workflows/release/badge.svg)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

<br><br><br><br>

## Install

```sh
npm install unity-changeset
```

## Usage

### As a node module:

```js
const { getUnityChangeset, scrapeArchivedChangesets, scrapeBetaChangesets } = require('unity-changeset');

(async () => {
    const changeset = await getUnityChangeset('2020.1.14f1');
    console.log(changeset);
    //=> UnityChangeset {version: '2020.1.14f1', changeset: 'd81f64f5201d'}
    console.log(changeset.toString());
    //=> 2020.1.14f1     d81f64f5201d
    const changesets = await scrapeArchivedChangesets();
    console.dir(changesets);
    //=> [
    //     UnityChangeset { version: '2020.1.15f1', changeset: '97d0ae02d19d' },
    //     UnityChangeset { version: '2020.1.14f1', changeset: 'd81f64f5201d' },
    //     UnityChangeset { version: '2020.1.13f1', changeset: '5e24f28bfbc0' },
    //     ...
    //   ]
    const betaChangesets = await scrapeBetaChangesets();
    console.log(betaChangesets);
    //=> [
    //     UnityChangeset { version: '2020.2.0b13', changeset: '655e1a328b90' },
    //     UnityChangeset { version: '2020.2.0b12', changeset: '92852ae685d8' },
    //     UnityChangeset { version: '2020.2.0b11', changeset: 'c499c2bf2e80' },
    //     ...
    //   ]
})();
```

### As a command-line utility:

```
Usage: Get a changeset for specific version
  $ unity-changeset <version>

Usage: List changesets
  $ unity-changeset list [options]

Options:
  --min <version>  Minimum version (included)
  --max <version>  Maximum version (included)
  --grep <version> Grep version
  --json           Output in json format
  --pretty-json    Output in pretty json format
  --all            List all changesets (alpha/beta included)
  --beta           List alpha/beta changesets
  --versions       Output only the available Unity versions
  --minor-versions Output only the available Unity minor versions
```

```sh
# Install
$ npm install -g unity-changeset

# Get a changeset for specific version:
$ unity-changeset 2020.2.14f1
d81f64f5201d

# List changesets:
$ unity-changeset list
2020.1.14f1     d81f64f5201d
2020.1.13f1     5e24f28bfbc0
2020.1.12f1     55b56f0a86e3
...

# List changesets in json format:
$ unity-changeset list --json
[{"version":"2020.1.15f1","changeset":"97d0ae02d19d"},{"version":"2020.1.14f1","changeset":"d81f64f5201d"},...]

# List changesets in pretty json format:
$ unity-changeset list --pretty-json
[
  {
    "version": "2020.1.15f1",
    "changeset": "97d0ae02d19d"
  },
  {
    "version": "2020.1.14f1",
    "changeset": "d81f64f5201d"
  },
  ...
]

# List changesets (beta):
$ unity-changeset list --beta
2020.2.0b13     655e1a328b90
2020.2.0b12     92852ae685d8
2020.2.0b11     c499c2bf2e80
...

# List the available Unity versions:
$ unity-changeset list --versions
2020.1.14f1
2020.1.13f1
2020.1.12f1
...

# List Unity 2018.3 or later, and 2019.1 or earlier:
$ unity-changeset list --min 2018.3 --max 2019.1
2019.1.14f1     148b5891095a
...
2018.3.1f1	    bb579dc42f1d
2018.3.0f2	    6e9a27477296

# List all Unity 2018.3 versions:
$ unity-changeset list --grep 2018.3
2018.3.14f1     d0e9f15437b1
2018.3.13f1     06548a9e9582
...
2018.3.1f1	    bb579dc42f1d
2018.3.0f2	    6e9a27477296

# List the available Unity minor versions:
$ unity-changeset list --minor-versions
2020.1
...
2017.2
2017.1

# For more info, run with the `-h, --help` flag:
$ unity-version -h
```

### Install a specific version of Unity via UnityHub

```sh
# /path/of/unity/hub/executor:
#   Windows: C:\\Program\ Files\\Unity\ Hub\\Unity\ Hub.exe
#   MacOS: /Applications/Unity\ Hub.app/Contents/MacOS/Unity\ Hub

# Show help:
$ /path/of/unity/hub/executor -- --headless help

# Install Unity with iOS and Android modules:
$ version=2020.1.14f1
$ /path/of/unity/hub/executor install --no-sandbox --headless --version ${version} --changeset `unity-changeset ${version}` --module ios,android
```

<br><br><br><br>

## Contributing

### Issues

Issues are very valuable to this project.

- Ideas are a valuable source of contributions others can make
- Problems show where this project is lacking
- With a question you show where contributors can improve the user experience

### Pull Requests

Pull requests are, a great way to get your ideas into this repository.  

### Support

This is an open source project that I am developing in my spare time.  
If you like it, please support me.  
With your support, I can spend more time on development. :)

[![](https://user-images.githubusercontent.com/12690315/66942881-03686280-f085-11e9-9586-fc0b6011029f.png)](https://github.com/users/mob-sakai/sponsorship)

<br><br><br><br>

## License

* MIT

## Author

* ![](https://user-images.githubusercontent.com/12690315/96986908-434a0b80-155d-11eb-8275-85138ab90afa.png) [mob-sakai](https://github.com/mob-sakai) [![](https://img.shields.io/twitter/follow/mob_sakai.svg?label=Follow&style=social)](https://twitter.com/intent/follow?screen_name=mob_sakai) ![GitHub followers](https://img.shields.io/github/followers/mob-sakai?style=social)

## See Also

* GitHub page : https://github.com/mob-sakai/unity-changeset
* Releases : https://github.com/mob-sakai/unity-changeset/releases
* Issue tracker : https://github.com/mob-sakai/unity-changeset/issues
* Change log : https://github.com/mob-sakai/unity-changeset/blob/main/CHANGELOG.md
