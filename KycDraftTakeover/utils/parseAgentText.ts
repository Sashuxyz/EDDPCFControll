import * as React from 'react';

const HEADING_REGEX = /^[A-Z][A-Z\s&/\-]+:$/;
const LIST_ITEM_REGEX = /^\s*-\s+/;
const SOURCE_LINK_REGEX = /^\[(\d+)\]\s+(https?:\/\/\S+)/;

export function parseAgentText(rawText: string): React.ReactNode[] {
  const paragraphs = rawText.split('\n\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const para of paragraphs) {
    const lines = para.split('\n');
    const paraElements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length === 0) return;
      paraElements.push(
        React.createElement('div', {
          key: key++,
          style: { paddingLeft: '12px', borderLeft: '2px solid #E1DFDD', marginBottom: '8px', fontSize: '13px', color: '#605E5C', lineHeight: '1.6' },
        }, listItems.map((item, i) => React.createElement('div', { key: i }, item)))
      );
      listItems = [];
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (HEADING_REGEX.test(trimmed)) {
        flushList();
        const headingText = trimmed.replace(/:$/, '');
        paraElements.push(
          React.createElement('div', {
            key: key++,
            style: { fontSize: '12px', fontWeight: 600, color: '#605E5C', textTransform: 'uppercase' as const, letterSpacing: '0.3px', marginBottom: '4px', marginTop: '8px' },
          }, headingText)
        );
      } else if (LIST_ITEM_REGEX.test(line)) {
        listItems.push(line.replace(LIST_ITEM_REGEX, ''));
      } else {
        flushList();
        paraElements.push(
          React.createElement('span', { key: key++ }, [trimmed, React.createElement('br', { key: `br-${key++}` })])
        );
      }
    }

    flushList();

    if (paraElements.length > 0) {
      elements.push(
        React.createElement('div', { key: key++, style: { marginBottom: '8px' } }, paraElements)
      );
    }
  }

  return elements;
}

export interface SourceLink {
  ref: string;
  url: string;
}

export function parseSourceLinks(rawText: string): SourceLink[] {
  const links: SourceLink[] = [];
  const lines = rawText.split('\n');

  for (const line of lines) {
    const match = SOURCE_LINK_REGEX.exec(line.trim());
    if (match) {
      links.push({ ref: match[1], url: match[2] });
    }
  }

  return links;
}
