import 'server-only';
import type {
  ApiResponse,
  AuthConfig,
  City,
  Faq,
  LocalityInsights,
  PaginationMeta,
  ProfileCard,
  ProjectCard,
  PropertyCard,
  PublicProfile,
  PublicProject,
  PublicProperty,
  SiteSettings,
} from '@nexus/shared';
import { FALLBACK_SETTINGS, REVALIDATE_SECONDS } from './site';

const API = (process.env.API_INTERNAL_URL ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiUnavailableError extends Error {}
export class ApiNotFoundError extends Error {}

type FetchOpts = { revalidate?: number | false; tags?: string[] };

/** Server-side GET against the API. Throws ApiNotFoundError on 404 and ApiUnavailableError on network/5xx. */
async function get<T>(
  path: string,
  opts: FetchOpts = {},
): Promise<{ data: T; meta?: PaginationMeta }> {
  let res: Response;
  try {
    res = await fetch(`${API}/api/v1${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: opts.revalidate ?? REVALIDATE_SECONDS, tags: opts.tags },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    throw new ApiUnavailableError(`API unreachable: ${(err as Error).message}`);
  }
  if (res.status === 404) throw new ApiNotFoundError(path);
  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiUnavailableError(`Invalid API response (${res.status})`);
  }
  if (!body.ok) throw new ApiUnavailableError(body.error.message);
  return { data: body.data, meta: body.meta };
}

export async function getSettings(): Promise<SiteSettings> {
  try {
    return (await get<SiteSettings>('/settings', { tags: ['settings'] })).data;
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export async function searchProperties(qs: string) {
  const { data, meta } = await get<PropertyCard[]>(`/properties${qs ? `?${qs}` : ''}`, {
    tags: ['properties'],
  });
  return { items: data, meta: meta! };
}

export type DetailResponse =
  | { property: PublicProperty; similar: PropertyCard[]; redirectTo?: undefined }
  | { redirectTo: string; property?: undefined; similar?: undefined };

export async function getProperty(slug: string): Promise<DetailResponse | null> {
  try {
    return (
      await get<DetailResponse>(`/properties/${encodeURIComponent(slug)}`, {
        tags: ['properties', `property:${slug}`],
      })
    ).data;
  } catch (err) {
    if (err instanceof ApiNotFoundError) return null;
    throw err;
  }
}

export type HomeSections = {
  featured: PropertyCard[];
  recentSale: PropertyCard[];
  recentRent: PropertyCard[];
  counts: { sale: number; rent: number };
  projects: ProjectCard[];
};

export async function getHome(): Promise<HomeSections> {
  try {
    return (await get<HomeSections>('/home', { tags: ['properties'] })).data;
  } catch {
    return {
      featured: [],
      recentSale: [],
      recentRent: [],
      counts: { sale: 0, rent: 0 },
      projects: [],
    };
  }
}

export async function getLocations(): Promise<City[]> {
  try {
    return (await get<City[]>('/locations', { tags: ['locations'] })).data;
  } catch {
    return [];
  }
}

export async function getCity(slug: string): Promise<City | null> {
  try {
    return (await get<City>(`/locations/${encodeURIComponent(slug)}`, { tags: ['locations'] }))
      .data;
  } catch (err) {
    if (err instanceof ApiNotFoundError) return null;
    throw err;
  }
}

export async function getFaqs(opts: { category?: string; home?: boolean } = {}): Promise<Faq[]> {
  const qs = new URLSearchParams();
  if (opts.category) qs.set('category', opts.category);
  if (opts.home) qs.set('home', 'true');
  try {
    return (await get<Faq[]>(`/faqs${qs.size ? `?${qs}` : ''}`, { tags: ['faqs'] })).data;
  } catch {
    return [];
  }
}

export async function getSitemapProperties(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    return (
      await get<{ slug: string; updatedAt: string }[]>('/sitemap/properties', { revalidate: 300 })
    ).data;
  } catch {
    return [];
  }
}

export async function getAuthConfig(): Promise<AuthConfig> {
  try {
    return (await get<AuthConfig>('/auth/config', { revalidate: 300 })).data;
  } catch {
    return { otpEnabled: false, emailResetEnabled: false };
  }
}

/** GET that returns null on 404 (and rethrows other failures). */
async function getOrNull<T>(path: string, opts: FetchOpts): Promise<T | null> {
  try {
    return (await get<T>(path, opts)).data;
  } catch (err) {
    if (err instanceof ApiNotFoundError) return null;
    throw err;
  }
}

export async function searchProjects(qs: string) {
  const { data, meta } = await get<ProjectCard[]>(`/projects${qs ? `?${qs}` : ''}`, {
    tags: ['projects'],
  });
  return { items: data, meta: meta! };
}

export function getProject(slug: string) {
  return getOrNull<PublicProject>(`/projects/${encodeURIComponent(slug)}`, {
    tags: ['projects', `project:${slug}`],
  });
}

export type ProfileRole = 'agent' | 'builder';
const profileRoot = (role: ProfileRole) => (role === 'agent' ? 'agents' : 'builders');

export async function listProfiles(role: ProfileRole, qs: string) {
  const { data, meta } = await get<ProfileCard[]>(`/${profileRoot(role)}${qs ? `?${qs}` : ''}`, {
    tags: ['profiles'],
  });
  return { items: data, meta: meta! };
}

export function getProfile(role: ProfileRole, slug: string) {
  return getOrNull<PublicProfile>(`/${profileRoot(role)}/${encodeURIComponent(slug)}`, {
    tags: ['profiles'],
  });
}

export async function getLocalityInsights(city: string, locality: string) {
  try {
    return await getOrNull<LocalityInsights>(
      `/locations/${encodeURIComponent(city)}/${encodeURIComponent(locality)}/insights`,
      { tags: ['properties', 'locations'] },
    );
  } catch {
    // Insights are a bonus on the page; never fail the listing page over them.
    return null;
  }
}

export async function getSitemapProjects(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    return (
      await get<{ slug: string; updatedAt: string }[]>('/sitemap/projects', { revalidate: 300 })
    ).data;
  } catch {
    return [];
  }
}

export async function getSitemapProfiles(): Promise<{ path: string; updatedAt: string }[]> {
  try {
    return (
      await get<{ path: string; updatedAt: string }[]>('/sitemap/profiles', { revalidate: 300 })
    ).data;
  } catch {
    return [];
  }
}
