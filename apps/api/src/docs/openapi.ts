/**
 * OpenAPI 3.1 contract for the NEXUS API. Served at /api/docs when ENABLE_API_DOCS=true.
 * Keep in sync with routes/*.ts — the API tests assert every documented path exists.
 */
const json = (schema: object) => ({ 'application/json': { schema } });
const okEnvelope = (data: object, paginated = false) => ({
  type: 'object',
  properties: {
    ok: { const: true },
    data,
    ...(paginated ? { meta: { $ref: '#/components/schemas/Pagination' } } : {}),
  },
});
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errors = {
  '400': { description: 'Bad request', content: json(ref('Error')) },
  '422': { description: 'Validation failed', content: json(ref('Error')) },
  '429': { description: 'Rate limited', content: json(ref('Error')) },
};
const authErrors = {
  '401': { description: 'Not signed in', content: json(ref('Error')) },
  '403': { description: 'Forbidden or CSRF failure', content: json(ref('Error')) },
};
const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string', pattern: '^[a-f0-9]{24}$' },
};
const admin = { tags: ['Admin'], security: [{ session: [], csrf: [] }] };
const q = (name: string, schema: object, description?: string) => ({
  name,
  in: 'query',
  schema,
  description,
});

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'NEXUS Estate API',
    version: '1.0.0',
    description:
      'REST API for the NEXUS Estate rental platform. All responses use the envelope `{ ok, data, meta? }` or `{ ok: false, error }`. Admin endpoints need the `nexus_session` cookie and, for writes, the `X-CSRF-Token` header (value returned at login and in the `nexus_csrf` cookie).',
  },
  servers: [{ url: '/api/v1' }],
  tags: [{ name: 'Public' }, { name: 'Admin' }, { name: 'System' }],
  components: {
    securitySchemes: {
      session: { type: 'apiKey', in: 'cookie', name: 'nexus_session' },
      csrf: { type: 'apiKey', in: 'header', name: 'X-CSRF-Token' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          ok: { const: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
        },
      },
      PropertyCard: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          title: { type: 'string' },
          category: { type: 'string', enum: ['residential', 'commercial', 'industrial'] },
          propertyType: { type: 'string' },
          monthlyRent: { type: 'integer', description: 'INR per month' },
          areaValue: { type: 'number' },
          areaUnit: { type: 'string', enum: ['sqft', 'sqyd', 'sqm'] },
          bedrooms: { type: ['integer', 'null'] },
          city: {
            type: 'object',
            properties: { slug: { type: 'string' }, name: { type: 'string' } },
          },
          locality: {
            type: 'object',
            properties: { slug: { type: 'string' }, name: { type: 'string' } },
          },
          coverImage: { type: ['object', 'null'] },
          isDemo: { type: 'boolean' },
        },
      },
      PropertyInput: {
        type: 'object',
        description:
          'See packages/shared/src/schemas.ts (propertyCreateSchema) for the full rule set.',
        required: [
          'title',
          'description',
          'category',
          'propertyType',
          'citySlug',
          'localitySlug',
          'monthlyRent',
          'areaValue',
          'areaUnit',
          'furnishingStatus',
        ],
        properties: {
          title: { type: 'string', minLength: 8, maxLength: 140 },
          description: { type: 'string', minLength: 30 },
          category: { type: 'string' },
          propertyType: { type: 'string' },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'rented', 'inactive', 'archived'],
          },
          citySlug: { type: 'string' },
          localitySlug: { type: 'string' },
          monthlyRent: { type: 'integer', minimum: 1 },
          securityDeposit: { type: ['integer', 'null'], minimum: 0 },
          areaValue: { type: 'number' },
          areaUnit: { type: 'string' },
          bedrooms: {
            type: ['integer', 'null'],
            description: 'Required for apartment, house, builder floor, villa',
          },
          furnishingStatus: { type: 'string' },
          images: { type: 'array', items: { type: 'object' } },
        },
      },
      EnquiryInput: {
        type: 'object',
        required: ['name', 'phone', 'consent'],
        properties: {
          name: { type: 'string' },
          phone: {
            type: 'string',
            description: '10-digit Indian mobile or +country format if enabled',
          },
          email: { type: 'string', format: 'email' },
          message: { type: 'string' },
          propertyId: { type: 'string' },
          sourcePage: { type: 'string' },
          consent: { const: true },
          website: { type: 'string', description: 'Honeypot — leave empty' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness and database check',
        responses: {
          '200': { description: 'Healthy' },
          '503': { description: 'Database unavailable' },
        },
      },
    },
    '/properties': {
      get: {
        tags: ['Public'],
        summary: 'Search published listings',
        parameters: [
          q('category', { type: 'string' }),
          q('propertyType', { type: 'string' }, 'Comma separated'),
          q('city', { type: 'string' }),
          q('locality', { type: 'string' }),
          q('minRent', { type: 'integer' }),
          q('maxRent', { type: 'integer' }),
          q('furnishing', { type: 'string' }),
          q('bedrooms', { type: 'integer' }, 'Minimum'),
          q('bathrooms', { type: 'integer' }, 'Minimum'),
          q('minArea', { type: 'integer' }, 'sq ft'),
          q('maxArea', { type: 'integer' }, 'sq ft'),
          q('amenities', { type: 'string' }, 'Comma separated; all must match'),
          q('parking', { type: 'boolean' }),
          q('availableNow', { type: 'boolean' }),
          q('q', { type: 'string' }),
          q('sort', { type: 'string', enum: ['newest', 'rent_asc', 'rent_desc'] }),
          q('page', { type: 'integer' }),
          q('limit', { type: 'integer', maximum: 48 }),
        ],
        responses: {
          '200': {
            description: 'Results',
            content: json(okEnvelope({ type: 'array', items: ref('PropertyCard') }, true)),
          },
        },
      },
    },
    '/properties/{slug}': {
      get: {
        tags: ['Public'],
        summary: 'Property details with similar listings, or { redirectTo } when the slug changed',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Found' },
          '404': { description: 'Not found', content: json(ref('Error')) },
        },
      },
    },
    '/home': {
      get: {
        tags: ['Public'],
        summary: 'Featured and recent listings',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/sitemap/properties': {
      get: {
        tags: ['Public'],
        summary: 'Slugs for the XML sitemap',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/locations': {
      get: {
        tags: ['Public'],
        summary: 'Active cities and localities with listing counts',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/locations/{city}': {
      get: {
        tags: ['Public'],
        summary: 'One city',
        parameters: [{ name: 'city', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
    },
    '/categories': {
      get: {
        tags: ['Public'],
        summary: 'Categories and property types',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/faqs': {
      get: {
        tags: ['Public'],
        summary: 'Published FAQs',
        parameters: [q('category', { type: 'string' }), q('home', { type: 'boolean' })],
        responses: { '200': { description: 'OK' } },
      },
    },
    '/settings': {
      get: {
        tags: ['Public'],
        summary: 'Public business details',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/enquiries': {
      post: {
        tags: ['Public'],
        summary: 'Submit an enquiry (rate limited)',
        requestBody: { required: true, content: json(ref('EnquiryInput')) },
        responses: { '201': { description: 'Saved; returns leadId' }, ...errors },
      },
    },
    '/property-submissions': {
      post: {
        tags: ['Public'],
        summary: 'Landlord listing request (rate limited)',
        responses: { '201': { description: 'Saved; returns leadId' }, ...errors },
      },
    },
    '/admin/auth/login': {
      post: {
        tags: ['Admin'],
        summary: 'Sign in; sets session and CSRF cookies',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'password'],
            properties: { email: { type: 'string' }, password: { type: 'string' } },
          }),
        },
        responses: {
          '200': { description: 'Signed in' },
          '401': { description: 'Invalid credentials' },
          '423': { description: 'Locked' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/admin/auth/logout': {
      post: {
        tags: ['Admin'],
        summary: 'Clear session cookies',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/admin/auth/me': {
      get: {
        ...admin,
        summary: 'Current admin',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/auth/change-password': {
      post: {
        ...admin,
        summary: 'Change password and revoke other sessions',
        responses: { '200': { description: 'OK' }, ...authErrors, ...errors },
      },
    },
    '/admin/auth/logout-all': {
      post: {
        ...admin,
        summary: 'Revoke every session',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/dashboard': {
      get: {
        ...admin,
        summary: 'Counts and recent activity',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/properties': {
      get: {
        ...admin,
        summary: 'List all properties',
        parameters: [
          q('status', { type: 'string' }),
          q('category', { type: 'string' }),
          q('q', { type: 'string' }),
          q('page', { type: 'integer' }),
        ],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      post: {
        ...admin,
        summary: 'Create property',
        requestBody: { required: true, content: json(ref('PropertyInput')) },
        responses: { '201': { description: 'Created' }, ...authErrors, ...errors },
      },
    },
    '/admin/properties/{id}': {
      get: {
        ...admin,
        summary: 'Get property (incl. private fields)',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      patch: {
        ...admin,
        summary: 'Update property (partial)',
        parameters: [idParam],
        requestBody: { content: json(ref('PropertyInput')) },
        responses: { '200': { description: 'OK' }, ...authErrors, ...errors },
      },
      delete: {
        ...admin,
        summary: 'Delete property (admin role)',
        parameters: [idParam],
        responses: { '200': { description: 'Deleted' }, ...authErrors },
      },
    },
    '/admin/properties/{id}/status': {
      post: {
        ...admin,
        summary: 'Publish / unpublish / mark rented / archive',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors, ...errors },
      },
    },
    '/admin/uploads': {
      post: {
        ...admin,
        summary: 'Upload up to 10 images (multipart field "files"); per-file results',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Per-file results' }, ...authErrors, ...errors },
      },
    },
    '/admin/ai-images/status': {
      get: {
        ...admin,
        summary: 'Whether AI image generation is configured on the server',
        responses: { '200': { description: '{ enabled: boolean }' }, ...authErrors },
      },
    },
    '/admin/ai-images': {
      post: {
        ...admin,
        summary:
          'Generate a site image (home hero / section art) from a brief (admin role, 20/hour). Not for listing photos.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['brief'],
                properties: {
                  kind: { type: 'string', enum: ['hero', 'section'], default: 'hero' },
                  brief: { type: 'string', minLength: 10, maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: '{ url, publicId, width, height, alt, prompt }' },
          '502': { description: 'Image provider failed' },
          '503': { description: 'AI images not configured' },
          ...authErrors,
          ...errors,
        },
      },
    },
    '/admin/enquiries': {
      get: {
        ...admin,
        summary: 'List enquiries',
        parameters: [
          q('status', { type: 'string' }),
          q('q', { type: 'string' }),
          q('followUpDue', { type: 'boolean' }),
          q('page', { type: 'integer' }),
        ],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/enquiries/export.csv': {
      get: {
        ...admin,
        summary: 'CSV export (admin role)',
        responses: { '200': { description: 'CSV file' }, ...authErrors },
      },
    },
    '/admin/enquiries/{id}': {
      get: {
        ...admin,
        summary: 'Get enquiry',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      patch: {
        ...admin,
        summary: 'Update status, follow-up, assignee or add a note',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors, ...errors },
      },
    },
    '/admin/submissions': {
      get: {
        ...admin,
        summary: 'Landlord listing requests',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/submissions/{id}': {
      patch: {
        ...admin,
        summary: 'Update submission',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/locations': {
      get: {
        ...admin,
        summary: 'All cities incl. inactive',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      post: {
        ...admin,
        summary: 'Create city with localities',
        responses: { '201': { description: 'Created' }, ...authErrors, ...errors },
      },
    },
    '/admin/locations/{id}': {
      patch: {
        ...admin,
        summary: 'Update city',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors, ...errors },
      },
      delete: {
        ...admin,
        summary: 'Delete city without listings',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/faqs': {
      get: {
        ...admin,
        summary: 'All FAQs',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      post: {
        ...admin,
        summary: 'Create FAQ',
        responses: { '201': { description: 'Created' }, ...authErrors, ...errors },
      },
    },
    '/admin/faqs/{id}': {
      patch: {
        ...admin,
        summary: 'Update FAQ',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      delete: {
        ...admin,
        summary: 'Delete FAQ',
        parameters: [idParam],
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
    },
    '/admin/settings': {
      get: {
        ...admin,
        summary: 'Business settings',
        responses: { '200': { description: 'OK' }, ...authErrors },
      },
      patch: {
        ...admin,
        summary: 'Update business settings (admin role)',
        responses: { '200': { description: 'OK' }, ...authErrors, ...errors },
      },
    },
  },
} as const;
