const REGEXP_HUB_LINK = /^unityhub:\/\/(\d{4}\.\d+\.\d+(a|b|f|p)\d+)\/(\w{12})$/;
const REGEXP_UNITY = /^(\d+)\.(\d+)\.(\d+)([a-zA-Z]+)(\d+)/;
const REGEXP_UNITY_NUM = /^(\d+)\.?(\d+)?\.?(\d+)?([a-zA-Z]+)?(\d+)?/;

/*
Unity Changeset
*/
export class UnityChangeset {
  version = "";
  changeset = "";
  versionNumber = 0;
  minor = "";
  lifecycle = "";
  lts = false;

  constructor(version: string, changeset: string, lts: boolean = false) {
    Object.assign(this, { version, changeset, lts });

    const match = this.version.match(REGEXP_UNITY);
    if (match) {
      this.versionNumber = UnityChangeset.toNumber(this.version, false);
      this.minor = `${match[1]}.${match[2]}`;
      this.lifecycle = `${match[4]}`;
    }
  }

  get preRelease(): boolean {
    switch (this.lifecycle) {
      case "a":
        return true;
      case "b":
        return true;
      default:
        return false;
    }
  }

  toString = (): string => {
    return `${this.version}\t${this.changeset}`;
  };

  /*
   * Convert a Unity version to a number.
   */
  static isValid = (href: string): boolean => {
    return REGEXP_HUB_LINK.test(href);
  };

  static createFromDb = (line: string): UnityChangeset => {
    const splited = line.split("\t");
    return new UnityChangeset(splited[0], splited[1]);
  };

  static createFromHref = (href: string): UnityChangeset => {
    const match = href.match(REGEXP_HUB_LINK);
    return new UnityChangeset(match?.[1] as string, match?.[3] as string);
  };

  static toNumber = (version: string, max: boolean): number => {
    const match = version.toString().match(REGEXP_UNITY_NUM);
    if (match === null) return 0;

    return parseInt(match[1] || (max ? "9999" : "0")) * 100 * 100 * 100 * 100 +
      parseInt(match[2] || (max ? "99" : "0")) * 100 * 100 * 100 +
      parseInt(match[3] || (max ? "99" : "0")) * 100 * 100 +
      ((match[4] || (max ? "z" : "a")).toUpperCase().charCodeAt(0) - 65) * 100 +
      parseInt(match[5] || (max ? "99" : "0"));
  };
}
