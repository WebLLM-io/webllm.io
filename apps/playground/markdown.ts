import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';

// Register commonly used languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';
import sql from 'highlight.js/lib/languages/sql';
import yaml from 'highlight.js/lib/languages/yaml';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

// Configure marked with highlight.js integration
const marked = new Marked(
  markedHighlight({
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
  }),
);

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      // text is already highlighted HTML from markedHighlight
      const langLabel = lang ? `<span class="code-lang">${escapeAttr(lang)}</span>` : '';
      return `<div class="code-block-wrapper">`
        + `<div class="code-block-header">${langLabel}<button class="code-copy-btn" type="button">Copy</button></div>`
        + `<pre><code class="hljs">${text}</code></pre>`
        + `</div>`;
    },
  },
});

// DOMPurify config: allow markdown-common tags and highlight.js classes
const PURIFY_CONFIG = {
  RETURN_TRUSTED_TYPE: false as const,
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'br', 'hr',
    'strong', 'em', 'del', 's', 'u', 'sub', 'sup',
    'a', 'img',
    'ul', 'ol', 'li',
    'blockquote',
    'pre', 'code', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'button',
    'input', // for GFM task lists
    'mark',
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'alt', 'src',
    'class', 'type',
    'checked', 'disabled', // for task list checkboxes
  ],
  ADD_ATTR: ['target', 'rel'],
};

// Make all links open in new tab
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render markdown text to sanitized HTML.
 */
export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

/**
 * Set up event delegation for code copy buttons within a container.
 */
export function initCodeCopyHandler(container: HTMLElement): void {
  container.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('.code-copy-btn') as HTMLButtonElement | null;
    if (!btn) return;

    const wrapper = btn.closest('.code-block-wrapper');
    if (!wrapper) return;

    const codeEl = wrapper.querySelector('pre code');
    if (!codeEl) return;

    const code = codeEl.textContent || '';
    navigator.clipboard.writeText(code).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });
}

/**
 * Create a stream renderer that throttles markdown re-renders with rAF.
 * Returns { update, finalize, cancel }.
 */
export function createStreamRenderer(target: HTMLElement) {
  let currentText = '';
  let rafId: number | null = null;
  let cancelled = false;

  function render(text: string) {
    target.innerHTML = renderMarkdown(text);
  }

  return {
    /** Queue a re-render with the latest accumulated text. */
    update(text: string) {
      if (cancelled) return;
      currentText = text;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (!cancelled) render(currentText);
        });
      }
    },

    /** Final render — cancel any pending rAF and render immediately. */
    finalize(text: string) {
      if (cancelled) return;
      currentText = text;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      render(currentText);
    },

    /** Cancel any pending render. */
    cancel() {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
  };
}
