import { getLocations, getSettings } from '@/lib/api';
import { sectionsOn } from '@/lib/sections';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

/**
 * /llms.txt: a short, plain-text guide to the site for LLM-based search tools
 * (see llmstxt.org). Lists the main city pages and sections; area pages are
 * reachable from the sitemap.
 */
export async function GET() {
  const [cities, settings] = await Promise.all([getLocations().catch(() => []), getSettings()]);
  const on = sectionsOn(settings);
  const line = (show: boolean, text: string) => (show ? [text] : []);
  const cityLines = (
    cities.length
      ? cities.flatMap((c) => [
          ...line(
            on.buy,
            `- [Property for sale in ${c.name}](${SITE_URL}/buy/${c.slug}): flats, houses, villas, plots, offices and shops for sale in ${c.name}`,
          ),
          ...line(
            on.rent,
            `- [Property for rent in ${c.name}](${SITE_URL}/rent/${c.slug}): flats, houses, rooms, PGs, offices and shops for rent in ${c.name}`,
          ),
        ])
      : [
          ...line(on.buy, `- [Buy property](${SITE_URL}/buy)`),
          ...line(on.rent, `- [Rent property](${SITE_URL}/rent)`),
        ]
  )
    .concat(
      line(
        on.projects,
        `- [New projects](${SITE_URL}/projects): residential projects with RERA details where the builder has added them`,
      ),
      line(
        on.commercial,
        `- [Commercial property](${SITE_URL}/commercial): offices, shops and showrooms`,
      ),
    )
    .join('\n');

  const body = `# NEXUS Estate

> NEXUS Estate (nexusestate.in) is a property portal for Jaipur, Rajasthan, India. People buy, rent and sell flats, independent houses, villas, plots, offices and shops. Listings come from owners, agents and builders and are reviewed by the NEXUS team before they go live. Owners, agents and builders post listings with a Premium plan; agents and builders get 5 free listings.

## Buy and rent
${cityLines}

## Guides
- [Blog](${SITE_URL}/blog): guides on buying, renting, legal checks (JDA, RERA, stamp duty) and Jaipur localities

## For owners, agents and builders
- [Post property free](${SITE_URL}/post-property)
- [Agents](${SITE_URL}/agents)
- [Builders](${SITE_URL}/builders)

## About
- [About NEXUS Estate](${SITE_URL}/about)
- [Contact](${SITE_URL}/contact)
- [FAQ](${SITE_URL}/faq)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
