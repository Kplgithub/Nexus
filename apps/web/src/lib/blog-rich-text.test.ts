import { describe, expect, it } from 'vitest';
import { markdownToHtml } from './blog-rich-text';

describe('markdownToHtml', () => {
  it('converts headings, bold, italic, links, and lists to HTML', () => {
    const md = [
      '## Buying in Jaipur',
      '',
      'Check **RERA** and _title_ at [RERA](https://rera.rajasthan.gov.in).',
      '',
      '- Point one',
      '- Point two',
    ].join('\n');

    const html = markdownToHtml(md);
    expect(html).toContain('<h2>Buying in Jaipur</h2>');
    expect(html).toContain('<strong>RERA</strong>');
    expect(html).toContain('<em>title</em>');
    expect(html).toContain('<a href="https://rera.rajasthan.gov.in">RERA</a>');
    expect(html).toContain('<ul><li>Point one</li><li>Point two</li></ul>');
  });

  it('escapes raw HTML tags and unsafe URLs', () => {
    const html = markdownToHtml('Hello <script>alert(1)</script> [bad](javascript:alert(1))');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<a href="#">bad</a>');
  });
});
