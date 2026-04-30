import * as React from 'react';
import { tokenize, TokenizerOptions } from '../utils/tokenizer';
import { renderTokensToHtml } from '../utils/renderTokens';
import { getCaretOffset, restoreCaretOffset } from '../utils/caretPreservation';
import { isSafeHref } from '../utils/urlValidation';
import { editorStyles, INJECTED_CSS } from '../styles/tokens';

interface RichTextMemoProps {
  value: string;
  disabled: boolean;
  placeholder: string;
  infoText: string;
  maxHeight: number;
  tokenizerOptions: TokenizerOptions;
  onValueChange: (value: string) => void;
}

let cssInjected = false;
function injectCss(): void {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = INJECTED_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

const RETOKENIZE_KEYS = new Set([
  ' ', 'Enter', 'Tab', '.', ',', ';', ':', '!', '?', ')', ']', '}', '>',
]);

const infoTextStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: '#605E5C',
  marginBottom: 6,
};

export const RichTextMemoEditor: React.FC<RichTextMemoProps> = ({
  value,
  disabled,
  placeholder,
  infoText,
  maxHeight,
  tokenizerOptions,
  onValueChange,
}) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [modifierActive, setModifierActive] = React.useState(false);
  const composingRef = React.useRef(false);
  const internalValueRef = React.useRef(value);
  const [isEmpty, setIsEmpty] = React.useState(!value);

  // Debug panel — shows last 8 events to diagnose paste issues
  const [debugLog, setDebugLog] = React.useState<string[]>([]);
  const addDebug = React.useCallback((msg: string) => {
    setDebugLog((prev) => [...prev.slice(-7), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  // Sync isEmpty from value prop (external changes)
  React.useEffect(() => { setIsEmpty(!value); }, [value]);

  React.useEffect(() => { injectCss(); }, []);

  // Track modifier keys globally
  React.useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setModifierActive(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setModifierActive(false);
    };
    const onWinBlur = () => setModifierActive(false);

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onWinBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onWinBlur);
    };
  }, []);

  // Tokenize and render HTML
  const renderedHtml = React.useMemo(
    () => renderTokensToHtml(tokenize(value, tokenizerOptions)),
    [value, tokenizerOptions]
  );

  // Sync innerHTML when value changes externally or after retokenise
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    addDebug(`useEffect[renderedHtml] — value.len=${value.length}, html.len=${renderedHtml.length}`);
    if (document.activeElement === el) {
      const offset = getCaretOffset(el);
      el.innerHTML = renderedHtml;
      restoreCaretOffset(el, offset);
    } else {
      el.innerHTML = renderedHtml;
    }
    internalValueRef.current = value;
  }, [renderedHtml]);

  // Auto-grow helper — deferred via rAF to avoid blocking input events
  const heightRafRef = React.useRef(0);
  const adjustHeight = React.useCallback(() => {
    cancelAnimationFrame(heightRafRef.current);
    heightRafRef.current = requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const scrollH = el.scrollHeight;
      el.style.height = `${Math.min(scrollH, maxHeight)}px`;
      el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
    });
  }, [maxHeight]);

  // Auto-grow on external value change
  React.useEffect(() => { adjustHeight(); }, [value, adjustHeight]);

  const retokenize = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    if (text !== internalValueRef.current) {
      internalValueRef.current = text;
      onValueChange(text);
    }
  }, [onValueChange]);

  const handleInput = React.useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    addDebug(`handleInput — text.len=${text.length}, prev.len=${internalValueRef.current.length}`);
    internalValueRef.current = text;
    setIsEmpty(!text);
    onValueChange(text);
    adjustHeight();
  }, [onValueChange, adjustHeight, addDebug]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (composingRef.current) return;

    // Alt+Enter: open link at caret
    if (e.altKey && e.key === 'Enter') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.anchorNode;
        while (node && node !== editorRef.current) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            if (el.tagName === 'A' && el.dataset.linkType) {
              const href = el.getAttribute('href');
              if (href && isSafeHref(href)) {
                e.preventDefault();
                window.open(href, '_blank', 'noopener,noreferrer');
              }
              return;
            }
          }
          node = node.parentNode;
        }
      }
      return;
    }

    // Schedule retokenise on word-boundary keys
    if (RETOKENIZE_KEYS.has(e.key)) {
      requestAnimationFrame(() => retokenize());
    }
  }, [retokenize]);

  // Stable refs so the paste listener closure doesn't go stale
  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;
  const adjustHeightRef = React.useRef(adjustHeight);
  adjustHeightRef.current = adjustHeight;

  // Debug ref for paste logging
  const addDebugRef = React.useRef(addDebug);
  addDebugRef.current = addDebug;

  // Let the browser handle paste natively — just sync state afterward
  React.useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const onPaste = (e: ClipboardEvent) => {
      const clipText = e.clipboardData?.getData('text/plain') ?? '(no clipboardData)';
      addDebugRef.current(`PASTE event fired — clipboard.len=${clipText.length}, type=${e.type}`);

      requestAnimationFrame(() => {
        const fullText = el.textContent ?? '';
        addDebugRef.current(`PASTE rAF — dom.len=${fullText.length}, prev.len=${internalValueRef.current.length}`);
        internalValueRef.current = fullText;
        setIsEmpty(!fullText);
        onValueChangeRef.current(fullText);
        adjustHeightRef.current();
      });
    };

    el.addEventListener('paste', onPaste);
    return () => el.removeEventListener('paste', onPaste);
  }, []);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest(
      'a[data-link-type]'
    ) as HTMLElement | null;
    if (!target) return;

    const shouldOpen = disabled || e.metaKey || e.ctrlKey;
    if (!shouldOpen) return;

    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return;

    e.preventDefault();
    const href = target.getAttribute('href');
    if (!href || !isSafeHref(href)) return;
    window.open(href, '_blank', 'noopener,noreferrer');
  }, [disabled]);

  const handleFocus = React.useCallback(() => setFocused(true), []);

  const handleBlur = React.useCallback(() => {
    setFocused(false);
    retokenize();
  }, [retokenize]);

  const handleCompositionStart = React.useCallback(() => {
    composingRef.current = true;
  }, []);
  const handleCompositionEnd = React.useCallback(() => {
    composingRef.current = false;
    requestAnimationFrame(() => retokenize());
  }, [retokenize]);

  const classNames = ['rtm-editor'];
  if (isEmpty) classNames.push('rtm--empty');
  if (modifierActive) classNames.push('rtm--modifier-active');
  if (disabled) classNames.push('rtm--disabled');

  const style: React.CSSProperties = {
    ...editorStyles.editor,
    ...(focused ? editorStyles.editorFocused : {}),
    ...(disabled ? editorStyles.editorDisabled : {}),
    maxHeight,
  };

  return (
    <div style={editorStyles.container}>
      {infoText && <div style={infoTextStyle}>{infoText}</div>}
      <div
        ref={editorRef}
        className={classNames.join(' ')}
        contentEditable={
          disabled ? false : ('plaintext-only' as unknown as boolean)
        }
        spellCheck={true}
        role="textbox"
        aria-multiline={true}
        aria-label={placeholder || 'Text input'}
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        style={style}
        suppressContentEditableWarning={true}
      />
      {debugLog.length > 0 && (
        <div style={{
          marginTop: 8, padding: '6px 8px', background: '#FFF4CE',
          border: '1px solid #E1DFDD', borderRadius: 4, fontSize: 11,
          fontFamily: 'Consolas, monospace', color: '#605E5C', maxHeight: 120,
          overflowY: 'auto', whiteSpace: 'pre-wrap',
        }}>
          {debugLog.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
    </div>
  );
};
