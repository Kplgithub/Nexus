import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SITE_URL } from '@/lib/site';

const isExternal = (href?: string) =>
  !!href && /^https?:\/\//i.test(href) && !href.startsWith(SITE_URL);

const components: Components = {
  a: ({ href, title, children }) => (
    <a
      href={href}
      title={title}
      {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === 'string' && src ? (
      // Article images can come from any HTTPS host, so next/image (allow-listed hosts) is not used.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} loading="lazy" decoding="async" />
    ) : null,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  // The page already has the article title as its only h1.
  h1: ({ children }) => <h2>{children}</h2>,
};

/**
 * Renders staff-written Markdown. Raw HTML in the source is never rendered
 * (react-markdown escapes it) and unsafe link protocols are stripped.
 */
export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`prose-nexus prose-blog ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {source}
      </ReactMarkdown>
    </div>
  );
}
