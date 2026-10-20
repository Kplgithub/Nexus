/**
 * Idempotent base content: the launch city, its localities, starter FAQs and
 * default site settings. Safe to run repeatedly — existing records are kept.
 *
 * Locality and FAQ copy is a starting draft. Review it before launch.
 */
import { slugify } from '@nexus/shared';
import { City, Faq, SiteSettings } from '../models/misc.models.js';
import { DEFAULT_SETTINGS } from '../services/settings.service.js';
import { runScript } from './run.js';

const JAIPUR_LOCALITIES: { name: string; intro?: string }[] = [
  {
    name: 'Vaishali Nagar',
    intro:
      'Vaishali Nagar is a large, well-established residential area in west Jaipur with a mix of apartments, builder floors and independent houses, along with busy shopping streets suited to retail and small offices.',
  },
  {
    name: 'Malviya Nagar',
    intro:
      'Malviya Nagar in south Jaipur combines residential sectors with commercial stretches along its main roads, making it a common choice for both family homes and storefronts.',
  },
  {
    name: 'Jagatpura',
    intro:
      'Jagatpura in south-east Jaipur has seen steady growth in apartment projects and is popular with working professionals and students looking for newer housing.',
  },
  {
    name: 'C-Scheme',
    intro:
      'C-Scheme is one of central Jaipur’s best-known addresses, with offices, showrooms and premium residences close to key roads such as Ashok Marg and Prithviraj Road.',
  },
  { name: 'Mansarovar' },
  { name: 'Raja Park' },
  { name: 'Bani Park' },
  { name: 'Tonk Road' },
  { name: 'Civil Lines' },
  { name: 'Durgapura' },
  { name: 'Ajmer Road' },
  { name: 'Jawahar Nagar' },
  { name: 'Sodala' },
  { name: 'Nirman Nagar' },
  { name: 'Sitapura' },
];

const FAQS = [
  {
    category: 'general',
    showOnHome: true,
    question: 'What kind of properties does NEXUS Estate help with?',
    answer:
      'We help with residential rentals such as flats, independent houses, builder floors and villas, and commercial rentals such as offices, shops and showrooms. Tell us what you need and our team will share suitable options.',
  },
  {
    category: 'tenants',
    showOnHome: true,
    question: 'How do I arrange a property visit?',
    answer:
      'Use the enquiry form on any listing, call us, or message us on WhatsApp. We will confirm availability with the owner and suggest a visit time that works for you.',
  },
  {
    category: 'tenants',
    showOnHome: true,
    question: 'Are the listed rents final?',
    answer:
      'The listed rent is what the owner has asked for. Some listings are marked negotiable. Deposit, maintenance and other terms are shown where the owner has shared them, and our team will confirm everything before you commit.',
  },
  {
    category: 'tenants',
    showOnHome: false,
    question: 'What documents will I need to rent a home?',
    answer:
      'Owners usually ask for identity and address proof, and sometimes proof of employment or income. Requirements vary by owner, so we will tell you exactly what is needed for the property you choose.',
  },
  {
    category: 'owners',
    showOnHome: true,
    question: 'I own a property. How do I list it with NEXUS?',
    answer:
      'Fill in the “List Your Property” form or call us. Our team will contact you to understand the property, arrange photographs if needed, and agree the details before anything is published.',
  },
  {
    category: 'owners',
    showOnHome: false,
    question: 'Will my personal contact details be shown on the website?',
    answer:
      'No. Enquiries come to the NEXUS team first. We do not publish owners’ phone numbers or exact unit addresses on the website.',
  },
  {
    category: 'commercial',
    showOnHome: false,
    question: 'Can you help find office or retail space for a business?',
    answer:
      'Yes. Share your preferred area, size, budget and the type of business, and we will shortlist offices, shops or showrooms that suit how you plan to use the space.',
  },
  {
    category: 'general',
    showOnHome: false,
    question: 'Which areas do you cover?',
    answer:
      'We are starting in Jaipur, Rajasthan. The areas we currently list are shown on our locations pages, and we are happy to discuss requirements in other parts of the city.',
  },
] as const;

await runScript('seed:base', async () => {
  const exists = await City.findOne({ slug: 'jaipur' });
  if (!exists) {
    await City.create({
      name: 'Jaipur',
      slug: 'jaipur',
      state: 'Rajasthan',
      active: true,
      sortOrder: 0,
      intro:
        'Jaipur offers a wide range of rental options, from apartments and independent houses in established residential colonies to offices, shops and showrooms along the city’s main commercial roads. Browse current NEXUS listings below or tell us what you are looking for.',
      localities: JAIPUR_LOCALITIES.map((l) => ({ name: l.name, slug: slugify(l.name), active: true, intro: l.intro ?? '' })),
    });
    console.warn('Created Jaipur with', JAIPUR_LOCALITIES.length, 'localities');
  } else {
    let added = 0;
    for (const l of JAIPUR_LOCALITIES) {
      const slug = slugify(l.name);
      if (!exists.localities.some((x) => x.slug === slug)) {
        exists.localities.push({ name: l.name, slug, active: true, intro: l.intro ?? '' });
        added++;
      }
    }
    if (added) await exists.save();
    console.warn(`Jaipur exists; added ${added} missing localities`);
  }

  if ((await Faq.countDocuments()) === 0) {
    await Faq.insertMany(FAQS.map((f, i) => ({ ...f, sortOrder: i, published: true })));
    console.warn('Created', FAQS.length, 'FAQs');
  }

  await SiteSettings.updateOne({ key: 'site' }, { $setOnInsert: { key: 'site', data: DEFAULT_SETTINGS } }, { upsert: true });
});
