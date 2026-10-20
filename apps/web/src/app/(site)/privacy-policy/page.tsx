import type { Metadata } from 'next';
import Link from 'next/link';
import { formatIndianPhone } from '@nexus/shared';
import { getSettings } from '@/lib/api';
import { pageMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'How NEXUS Estate collects, uses and protects personal information shared through this website.',
  path: '/privacy-policy',
});

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Privacy Policy" path="/privacy-policy" updated="To be confirmed at launch">
      <p>
        This policy explains how {s.businessName} (“NEXUS”, “we”, “us”) handles personal information
        you share through this website. We aim to collect only what we need to respond to you and to
        process it in line with applicable Indian law, including the Digital Personal Data
        Protection Act, 2023.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Enquiries and callback requests:</strong> your name, mobile number, optional email
          address, your message and the property or page you enquired from.
        </li>
        <li>
          <strong>Property listing requests:</strong> owner or representative name, contact details
          and the property details you provide.
        </li>
        <li>
          <strong>Technical information:</strong> a one-way, non-reversible hash of your IP address
          and your browser type, used only to prevent spam and abuse.
        </li>
      </ul>
      <p>
        We do not ask for payment details, identity documents or passwords through this website.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>
          To contact you about your enquiry by phone, WhatsApp or email, as you agreed when
          submitting the form.
        </li>
        <li>To arrange property visits and share relevant options.</li>
        <li>To keep records of enquiries and protect the website against misuse.</li>
      </ul>
      <p>
        We do not sell your personal information. We do not publish property owners’ phone numbers
        on the website.
      </p>

      <h2>Sharing</h2>
      <p>
        When you enquire about a specific property, we may share your name and requirement with that
        property’s owner so a visit can be arranged. We use trusted service providers to host the
        website, store images and send emails; they process data only on our instructions.
      </p>

      <h2>Retention</h2>
      <p>
        We keep enquiry records for as long as needed to respond and follow up, and for a reasonable
        period afterwards for record keeping, after which they are deleted or anonymised.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to access, correct or delete the personal information we hold about you, or
        withdraw your consent to be contacted, by calling{' '}
        <a href={`tel:${s.phone}`}>{formatIndianPhone(s.phone)}</a>
        {s.email ? (
          <>
            {' '}
            or emailing <a href={`mailto:${s.email}`}>{s.email}</a>
          </>
        ) : null}
        .
      </p>

      <h2>Cookies</h2>
      <p>
        The public website does not use advertising or analytics cookies by default. See our{' '}
        <Link href="/cookie-policy">cookie policy</Link> for details.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The latest version will always be available on
        this page.
      </p>
    </LegalPage>
  );
}
