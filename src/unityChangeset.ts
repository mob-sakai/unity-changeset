const REGEXP_HUB_LINK = /^unityhub:\/\/(\d{4}\.\d+\.\d+(a|b|f)\d+)\/(\w{12})$/
const REGEXP_UNITY = /^(\d+)\.(\d+)\.(\d+)([a-zA-Z]+)(\d+)/;
const REGEXP_UNITY_NUM = /^(\d+)\.?(\d+)?\.?(\d+)?([a-zA-Z]+)?(\d+)?/;

export class UnityChangeset {
  version: string = '';
  changeset: string = '';
  versionNumber: number = 0;
  minor: string = '';
  lifecycle: string = '';


  constructor(version: string, changeset: string) {
    Object.assign(this, { version, changeset });

    const match = this.version.match(REGEXP_UNITY);
    if (match) {
      this.versionNumber = UnityChangeset.toNumber(this.version, false);
      this.minor = `${match[1]}.${match[2]}`;
      this.lifecycle = `${match[4]}`;
    }
  }

  toString = (): string => {
    return `${this.version}\t${this.changeset}`;
  }

  static isValid = (href: string): Boolean => {
    return REGEXP_HUB_LINK.test(href);
  };

  static createFromHref = (href: string): UnityChangeset => {
    const match = href.match(REGEXP_HUB_LINK);
    return new UnityChangeset(match?.[1] as string, match?.[3] as string);
  };

  static toNumber = (version: string, max: boolean): number => {
    const match = version.toString().match(REGEXP_UNITY_NUM);
    if (match === null) return 0;

    return parseInt(match[1] || (max ? '9999' : '0')) * 100 * 100 * 100 * 100
      + parseInt(match[2] || (max ? '99' : '0')) * 100 * 100 * 100
      + parseInt(match[3] || (max ? '99' : '0')) * 100 * 100
      + ((match[4] || (max ? 'z' : 'a')).toUpperCase().charCodeAt(0) - 65) * 100
      + parseInt(match[5] || (max ? '99' : '0'));
  };
}
