import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { Admin, City } from '../src/models/misc.models.js';
import { hashPassword } from '../src/services/auth.service.js';
import { clearSettingsCache } from '../src/services/settings.service.js';

let mongo: MongoMemoryServer | null = null;

export async function startDb(): Promise<Express> {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  return createApp();
}

export async function stopDb() {
  await mongoose.disconnect();
  await mongo?.stop();
  mongo = null;
}

export async function resetDb() {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
  clearSettingsCache();
}

export const ADMIN = { email: 'owner@example.test', password: 'Correct-Horse-9-Battery', name: 'Test Owner' };

export async function createAdmin(role: 'owner' | 'admin' | 'editor' = 'owner', email = ADMIN.email) {
  return Admin.create({ email, name: ADMIN.name, role, passwordHash: await hashPassword(ADMIN.password) });
}

export async function seedJaipur() {
  return City.create({
    name: 'Jaipur',
    slug: 'jaipur',
    state: 'Rajasthan',
    localities: [
      { name: 'Vaishali Nagar', slug: 'vaishali-nagar', intro: 'Test intro' },
      { name: 'C-Scheme', slug: 'c-scheme' },
      { name: 'Malviya Nagar', slug: 'malviya-nagar' },
    ],
  });
}

/** Supertest agent that is signed in and sends the CSRF header automatically. */
export async function signIn(app: Express, email = ADMIN.email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/admin/auth/login').send({ email, password: ADMIN.password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  const csrf: string = res.body.data.csrfToken;
  return {
    agent,
    csrf,
    get: (url: string) => agent.get(url),
    post: (url: string, body?: object) => agent.post(url).set('X-CSRF-Token', csrf).send(body),
    patch: (url: string, body?: object) => agent.patch(url).set('X-CSRF-Token', csrf).send(body),
    del: (url: string) => agent.delete(url).set('X-CSRF-Token', csrf),
  };
}

export const IMG = { url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', publicId: 'demo/sample', alt: 'Front view' };

export const residential = (overrides: Record<string, unknown> = {}) => ({
  title: '2 BHK apartment near Gandhi Path',
  description: 'A bright two-bedroom apartment with good ventilation and covered parking for one car.',
  category: 'residential',
  propertyType: 'apartment',
  citySlug: 'jaipur',
  localitySlug: 'vaishali-nagar',
  monthlyRent: 18000,
  securityDeposit: 36000,
  areaValue: 1050,
  areaUnit: 'sqft',
  bedrooms: 2,
  bathrooms: 2,
  furnishingStatus: 'semi-furnished',
  amenities: ['lift', 'power-backup'],
  parking: 'covered',
  ownerReference: 'Owner: Mr Sharma 98xxxxxx (PRIVATE)',
  internalNotes: 'Owner prefers families (PRIVATE)',
  images: [IMG],
  ...overrides,
});

export const commercial = (overrides: Record<string, unknown> = {}) => ({
  title: 'Furnished office near Ashok Marg',
  description: 'Ready-to-move office with twenty workstations, a cabin, conference room and pantry.',
  category: 'commercial',
  propertyType: 'office',
  citySlug: 'jaipur',
  localitySlug: 'c-scheme',
  monthlyRent: 85000,
  areaValue: 1600,
  areaUnit: 'sqft',
  furnishingStatus: 'furnished',
  amenities: ['power-backup', 'lift'],
  parking: 'covered',
  images: [IMG],
  ...overrides,
});
