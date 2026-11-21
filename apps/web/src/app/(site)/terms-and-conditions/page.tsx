import type { Metadata } from 'next';
import Link from 'next/link';
import { getSettings } from '@/lib/api';
import { pageMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = pageMetadata({
  title: 'Terms and Conditions',
  description: 'Terms for using the NEXUS Estate website and its property listings.',
  path: '/terms-and-conditions',
});

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage
      title="Terms and Conditions"
      path="/terms-and-conditions"
      updated="To be confirmed at launch"
    >
      <p>
        By using this website you agree to these terms. If you do not agree, please do not use the
        website.
      </p>

      <h2>Listings</h2>
      <p>
        Property details, photographs, rents, deposits and availability are provided by property
        owners or their representatives and are shown in good faith. They may change without notice
        and are confirmed only when you speak with our team. A listing on this website is an
        invitation to enquire, not an offer or a binding commitment.
      </p>

      <h2>No booking or payment through the website</h2>
      <p>
        This website does not take bookings, payments or deposits. Never transfer money based only
        on information on a website or a message. Rental agreements are made directly between the
        tenant and the property owner.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Provide accurate information in forms and only submit your own contact details.</li>
        <li>Only list a property if you own it or are authorised by the owner.</li>
        <li>
          Do not misuse the website, attempt to access the admin area, or submit automated or spam
          requests.
        </li>
      </ul>

      <h2>Our role</h2>
      <p>
        {s.businessName} helps tenants and owners find each other and offers rental guidance. Any
        fees for our services are agreed with you separately before they apply. We recommend that
        you inspect a property and verify ownership and documents before signing an agreement.
      </p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for losses arising from reliance on
        listing information or from agreements between tenants and owners.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The NEXUS name, logo and website content belong to {s.businessName} and may not be reused
        without permission.
      </p>

      <h2>Privacy</h2>
      <p>
        Our use of personal information is described in the{' '}
        <Link href="/privacy-policy">privacy policy</Link>.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India.</p>
    </LegalPage>
  );
}
