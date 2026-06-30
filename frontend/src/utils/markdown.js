import { marked }  from 'marked';
import DOMPurify   from 'dompurify';

marked.use({
  breaks: true,   // newline → <br>
  gfm:    true,   // GitHub-flavored markdown
});

export function renderMarkdown(text) {
  if (!text) return '';
  const raw = marked.parse(text);
  return DOMPurify.sanitize(raw);
}