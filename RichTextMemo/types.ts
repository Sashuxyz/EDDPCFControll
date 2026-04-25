export type LinkType = 'url' | 'email';

export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string; linkType: LinkType };

export interface DetectedMatch {
  start: number;
  end: number;
  text: string;
  href: string;
  linkType: LinkType;
  priority: number;
}
