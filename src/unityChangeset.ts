const REGEXP_UNITY = /^(\d+)\.(\d+)\.(\d+)([a-zA-Z]+)(\d+)/;
const REGEXP_UNITY_NUM = /^(\d+)\.?(\d+)?\.?(\d+)?([a-zA-Z]+)?(\d+)?/;

/*
Unity Release Stream
*/
export enum UnityReleaseStream {
  SUPPORTED = "SUPPORTED",
  LTS = "LTS",
  TECH = "TECH",
  BETA = "BETA",
  ALPHA = "ALPHA",
  UNDEFINED = "UNDEFINED",
}

/*
Unity Release Entitlement
*/
export enum UnityReleaseEntitlement {
  XLTS = "XLTS",
  U7_ALPHA = "U7_ALPHA",
}

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
  stream: UnityReleaseStream = UnityReleaseStream.UNDEFINED;
  entitlements: UnityReleaseEntitlement[] = [];
  xlts = false;

  constructor(
    version: string,
    changeset: string,
    stream: UnityReleaseStream = UnityReleaseStream.UNDEFINED,
    entitlements: UnityReleaseEntitlement[] = [],
  ) {
    if (!version || typeof version !== "string") {
      throw new Error("Version must be a non-empty string");
    }
    if (!changeset || typeof changeset !== "string") {
      throw new Error("Changeset must be a non-empty string");
    }
    if (!Array.isArray(entitlements)) {
      throw new Error("Entitlements must be an array");
    }

    Object.assign(this, { version, changeset, stream, entitlements });

    this.lts = stream === UnityReleaseStream.LTS;
    this.xlts = entitlements.includes(UnityReleaseEntitlement.XLTS);

    const match = this.version.match(REGEXP_UNITY);
    if (match) {
      this.versionNumber = UnityChangeset.toNumber(this.version, false);
      this.minor = `${match[1]}.${match[2]}`;
      this.lifecycle = `${match[4]}`;
    }
  }

  toString = (): string => {
    return `${this.version}\t${this.changeset}`;
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
