const REGEXP_HUB_LINK = /^unityhub:\/\/(\d{4}\.\d+\.\d+(a|b|f)\d+)\/(\w{12})$/

export interface UnityChangeset {
  version: string;
  changeset: string;
}

export class UnityChangeset {
  constructor(version: string, changeset: string) {
    Object.assign(this, { version, changeset });
  }

  toString() {
    return `${this.version}\t${this.changeset}`;
  }

  static isValid = (href: string): Boolean => {
    return REGEXP_HUB_LINK.test(href);
  };

  static createFromHref = (href: string): UnityChangeset => {
    const match = href.match(REGEXP_HUB_LINK);
    return new UnityChangeset(match?.[1] as string, match?.[3] as string);
  };
}
