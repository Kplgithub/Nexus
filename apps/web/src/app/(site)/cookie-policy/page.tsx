import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = pageMetadata({
  title: 'Cookie Policy',
  description: 'Which cookies the NEXUS Estate website uses and why.',
  path: '/cookie-policy',
});

export default function CookiePage() {
  return (
    <LegalPage title="Cookie Policy" path="/cookie-policy" updated="To be confirmed at launch">
      <p>
        Cookies are small files a website stores in your browser. We keep their use to a minimum.
      </p>
      <h2>Public website</h2>
      <p>
        Browsing listings and submitting enquiries does not set advertising or analytics cookies. If
        we add an analytics tool in future, we will update this page and, where required, ask for
        your consent first.
      </p>
      <h2>Admin area</h2>
      <p>
        Staff who sign in to manage listings receive two strictly necessary cookies:{' '}
        <code>nexus_session</code>, which keeps them signed in, and <code>nexus_csrf</code>, which
        protects their actions from cross-site attacks. These expire automatically and are not used
        for tracking.
      </p>
      <h2>Third-party links</h2>
      <p>
        Links to WhatsApp, maps or social media take you to those services, which have their own
        cookie policies.
      </p>
    </LegalPage>
  );
}
