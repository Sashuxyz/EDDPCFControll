import * as React from 'react';
import { parseAgentText, parseSourceLinks } from '../utils/parseAgentText';
import { formatCHF, isValidNumber, parseWealthValue } from '../types';
import { contentStyles, subFieldStyles, sourceStyles } from '../styles/tokens';

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface SubFieldDisplay {
  label: string;
  value: string;
  isNumeric: boolean;
}

interface SectionContentProps {
  text: string;
  isSourcesSection: boolean;
  subFields?: SubFieldDisplay[];
}

export const SectionContent: React.FC<SectionContentProps> = ({ text, isSourcesSection, subFields }) => {
  if (isSourcesSection) {
    const links = parseSourceLinks(text);
    if (links.length > 0) {
      return (
        <div style={contentStyles.body}>
          {links.map((link) => (
            <div key={link.ref} style={sourceStyles.linkItem}>
              <span style={sourceStyles.refBadge}>[{link.ref}]</span>
              {isSafeUrl(link.url) ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={sourceStyles.linkText}
                >
                  {link.url}
                </a>
              ) : (
                <span style={{ fontSize: '12px', color: '#605E5C' }}>{link.url}</span>
              )}
            </div>
          ))}
          {/* Render any non-link text */}
          {text.split('\n').filter((line) => !/^\[\d+\]\s+https?:\/\//.test(line.trim()) && line.trim()).length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {parseAgentText(text.split('\n').filter((line) => !/^\[\d+\]\s+https?:\/\//.test(line.trim()) && line.trim()).join('\n'))}
            </div>
          )}
        </div>
      );
    }
    // Fallback: render as plain text if no links found
    return <div style={contentStyles.body}>{parseAgentText(text)}</div>;
  }

  return (
    <div>
      <div style={contentStyles.body}>{parseAgentText(text)}</div>
      {subFields && subFields.length > 0 && (
        <div style={{ ...contentStyles.body, marginTop: '8px' }}>
          {subFields.map((sf) => (
            <div key={sf.label} style={subFieldStyles.badge}>
              <span style={subFieldStyles.badgeLabel}>{sf.label}</span>
              <span style={subFieldStyles.badgeValue}>
                {sf.isNumeric ? `CHF ${formatCHF(parseWealthValue(sf.value))}` : sf.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
