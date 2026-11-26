/**
 * Lightweight, dependency-free Markdown <-> HTML helpers for the admin BlogEditor
 * Visual (WYSIWYG) mode. Keeps saved post content in clean Markdown while letting
 * authors write and format visually without typing raw Markdown syntax.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/uploads\/|\/)/i.test(trimmed)) return trimmed;
  return '#';
}

function inlineMarkdownToHtml(raw: string): string {
  let out = escapeHtml(raw);
  // Images ![alt](url)
  out = out.replace(
    /!\[([^\]]*)\]\(([^)\s]+)\)/g,
    (_, alt: string, url: string) =>
      `<img src="${escapeHtml(safeUrl(url))}" alt="${escapeHtml(alt)}" />`,
  );
  // Links [label](url)
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label: string, url: string) =>
      `<a href="${escapeHtml(safeUrl(url))}">${label}</a>`,
  );
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic _text_ or *text*
  out = out.replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

/** Converts blog Markdown into clean HTML for the Visual editor. */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }

    // Headings
    const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      const level = Math.min(3, Math.max(2, hMatch[1]!.length));
      blocks.push(`<h${level}>${inlineMarkdownToHtml(hMatch[2]!)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) {
        qLines.push(lines[i]!.replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(`<blockquote><p>${qLines.map(inlineMarkdownToHtml).join('<br />')}</p></blockquote>`);
      continue;
    }

    // GFM Table
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|/.test(lines[i + 1]!)
    ) {
      const parseRow = (r: string) =>
        r
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim());
      const headers = parseRow(line);
      i += 2; // skip header and separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        rows.push(parseRow(lines[i]!));
        i++;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${inlineMarkdownToHtml(h)}</th>`).join('')}</tr></thead>`;
      const tbody = rows.length
        ? `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inlineMarkdownToHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
        : '';
      blocks.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) {
        items.push(`<li>${inlineMarkdownToHtml(lines[i]!.replace(/^\s*[-*]\s+/, ''))}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) {
        items.push(`<li>${inlineMarkdownToHtml(lines[i]!.replace(/^\s*\d+\.\s+/, ''))}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Paragraph (collect consecutive plain lines)
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{1,3}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|\|)/.test(lines[i]!)
    ) {
      pLines.push(lines[i]!);
      i++;
    }
    blocks.push(`<p>${pLines.map(inlineMarkdownToHtml).join('<br />')}</p>`);
  }

  return blocks.join('');
}

function serializeInline(node: Node): string {
  if (node.nodeType === 3) {
    return (node.textContent ?? '').replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== 1) return '';
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  if (tag === 'img') {
    const src = el.getAttribute('src') ?? '';
    const alt = el.getAttribute('alt') ?? '';
    return src ? `![${alt}](${src})` : '';
  }
  const inner = Array.from(el.childNodes).map(serializeInline).join('');
  if (tag === 'strong' || tag === 'b') {
    return inner.trim() ? `**${inner.trim()}**` : '';
  }
  if (tag === 'em' || tag === 'i') {
    return inner.trim() ? `_${inner.trim()}_` : '';
  }
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '';
    return href ? `[${inner || href}](${href})` : inner;
  }
  return inner;
}

function serializeTable(table: HTMLElement): string {
  const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
    Array.from(tr.querySelectorAll('th, td')).map((cell) =>
      serializeInline(cell).replace(/\n+/g, ' ').trim(),
    ),
  );
  if (rows.length === 0) return '';
  const cols = Math.max(...rows.map((r) => r.length), 1);
  const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? '');
  const head = pad(rows[0]!);
  const sep = Array.from({ length: cols }, () => '---');
  const body = rows.slice(1).map(pad);
  const fmt = (r: string[]) => `| ${r.join(' | ')} |`;
  return [fmt(head), fmt(sep), ...body.map(fmt)].join('\n');
}

/** Converts the Visual editor DOM back into clean blog Markdown. */
export function htmlToMarkdown(root: HTMLElement): string {
  const blocks: string[] = [];

  for (const child of Array.from(root.childNodes)) {
    if (child.nodeType === 3) {
      const t = (child.textContent ?? '').replace(/\u00a0/g, ' ').trim();
      if (t) blocks.push(t);
      continue;
    }
    if (child.nodeType !== 1) continue;
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2') {
      const text = serializeInline(el).trim();
      if (text) blocks.push(`## ${text}`);
    } else if (tag === 'h3') {
      const text = serializeInline(el).trim();
      if (text) blocks.push(`### ${text}`);
    } else if (tag === 'blockquote') {
      const text = serializeInline(el).trim();
      if (text) {
        blocks.push(
          text
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n'),
        );
      }
    } else if (tag === 'ul') {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'li')
        .map((li) => `- ${serializeInline(li).trim()}`)
        .filter((l) => l !== '-');
      if (items.length) blocks.push(items.join('\n'));
    } else if (tag === 'ol') {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'li')
        .map((li, idx) => `${idx + 1}. ${serializeInline(li).trim()}`)
        .filter((l) => !/^\d+\.$/.test(l));
      if (items.length) blocks.push(items.join('\n'));
    } else if (tag === 'table') {
      const mdTable = serializeTable(el);
      if (mdTable) blocks.push(mdTable);
    } else if (tag === 'img') {
      const mdImg = serializeInline(el).trim();
      if (mdImg) blocks.push(mdImg);
    } else {
      const text = serializeInline(el).trim();
      if (text) blocks.push(text);
    }
  }

  return blocks.join('\n\n').trim();
}
