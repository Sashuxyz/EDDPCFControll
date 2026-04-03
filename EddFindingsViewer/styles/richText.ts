let injected = false;
export const RICH_TEXT_CLASS = 'edd-rich-text-content';

export function injectRichTextStyles(): void {
  if (injected) return;
  const style = document.createElement('style');
  style.textContent = `
    .${RICH_TEXT_CLASS} { word-break: break-word; overflow-wrap: anywhere; overflow-x: hidden; max-width: 100%; box-sizing: border-box; white-space: pre-wrap; }
    .${RICH_TEXT_CLASS} img { max-width: 100%; height: auto; border-radius: 2px; }
    .${RICH_TEXT_CLASS} table { width: 100%; border-collapse: collapse; font-size: 12px; margin: 10px 0; table-layout: fixed; }
    .${RICH_TEXT_CLASS} th { text-align: left; padding: 6px 10px; border: 1px solid #edebe9; background-color: #F3F2F1; font-weight: 600; color: #323130; word-break: break-word; }
    .${RICH_TEXT_CLASS} td { padding: 6px 10px; border: 1px solid #edebe9; word-break: break-word; }
    .${RICH_TEXT_CLASS} p { margin: 0 0 8px 0; word-break: break-word; }
    .${RICH_TEXT_CLASS} ul, .${RICH_TEXT_CLASS} ol { padding: 0 0 0 20px; margin: 0 0 8px 0; }
    .${RICH_TEXT_CLASS} blockquote { border-left: 3px solid #edebe9; padding: 4px 12px; margin: 8px 0; color: #605E5C; }
    .${RICH_TEXT_CLASS} pre { background-color: #F3F2F1; padding: 8px 12px; border-radius: 2px; overflow: auto; font-size: 12px; }
  `;
  document.head.appendChild(style);
  injected = true;
}
