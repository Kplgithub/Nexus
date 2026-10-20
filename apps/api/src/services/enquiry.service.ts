import type { FilterQuery, Types } from 'mongoose';
import type { z } from 'zod';
import {
  normalizePhone,
  type Enquiry as EnquiryDto,
  type PropertySubmission as SubmissionDto,
  type adminEnquiryQuerySchema,
  type enquiryCreateSchema,
  type enquiryUpdateSchema,
  type propertySubmissionCreateSchema,
  type submissionUpdateSchema,
} from '@nexus/shared';
import { Enquiry, PropertySubmission } from '../models/misc.models.js';
import { Property } from '../models/property.model.js';
import { badRequest, notFound } from '../lib/errors.js';
import { escapeRegex, paginate } from '../lib/respond.js';
import { toCsv } from '../lib/csv.js';
import { nextLeadId } from './support.service.js';
import { getSettings } from './settings.service.js';
import { notifyNewLead } from './mail.service.js';

const CONSENT_TEXT =
  'I agree to be contacted by NEXUS Estate by phone, WhatsApp or email about this enquiry.';

/** Submissions faster than this are almost certainly automated. */
const MIN_HUMAN_MS = 2500;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export type RequestMeta = { ipHash?: string; userAgent?: string };

type EnquiryLean = {
  _id: Types.ObjectId;
  leadId: string;
  type: EnquiryDto['type'];
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  property?: Types.ObjectId | null;
  propertySnapshot?: { title?: string | null; slug?: string | null } | null;
  sourcePage?: string | null;
  preferredContactTime?: string | null;
  status: EnquiryDto['status'];
  followUpAt?: Date | null;
  assignedTo?: string | null;
  notes: { text: string; by: string; at: Date }[];
  consentAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

function toDto(e: EnquiryLean): EnquiryDto {
  return {
    id: String(e._id),
    leadId: e.leadId,
    type: e.type,
    name: e.name,
    phone: e.phone,
    email: e.email ?? null,
    message: e.message,
    property:
      e.property && e.propertySnapshot?.slug
        ? {
            id: String(e.property),
            title: e.propertySnapshot.title ?? '',
            slug: e.propertySnapshot.slug,
          }
        : null,
    sourcePage: e.sourcePage ?? null,
    preferredContactTime: e.preferredContactTime ?? null,
    status: e.status,
    followUpAt: e.followUpAt ? e.followUpAt.toISOString() : null,
    assignedTo: e.assignedTo ?? null,
    notes: (e.notes ?? []).map((n) => ({
      text: n.text,
      by: n.by,
      at: new Date(n.at).toISOString(),
    })),
    consentAt: e.consentAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

async function requirePhone(raw: string): Promise<string> {
  const settings = await getSettings();
  const phone = normalizePhone(raw, settings.allowInternationalEnquiries);
  if (!phone) {
    throw badRequest('Invalid phone number', {
      phone: [
        settings.allowInternationalEnquiries
          ? 'Enter a 10-digit Indian mobile number, or an international number starting with +'
          : 'Enter a valid 10-digit Indian mobile number',
      ],
    });
  }
  return phone;
}

function looksAutomated(input: { website?: string; elapsedMs?: number }) {
  return (
    Boolean(input.website) || (input.elapsedMs !== undefined && input.elapsedMs < MIN_HUMAN_MS)
  );
}

export async function createEnquiry(
  input: z.output<typeof enquiryCreateSchema>,
  meta: RequestMeta,
): Promise<{ leadId: string; duplicate: boolean }> {
  const phone = await requirePhone(input.phone);

  let property: { _id: Types.ObjectId; title: string; slug: string } | null = null;
  if (input.propertyId) {
    property = await Property.findOne({
      _id: input.propertyId,
      status: { $in: ['published', 'rented'] },
    })
      .select('title slug')
      .lean();
  }

  // The same person enquiring twice about the same thing within minutes: keep one lead.
  const recent = await Enquiry.findOne({
    phone,
    property: property?._id ?? null,
    createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
  })
    .select('leadId')
    .lean();
  if (recent) return { leadId: recent.leadId, duplicate: true };

  const spam = looksAutomated(input);
  const leadId = await nextLeadId('E');
  await Enquiry.create({
    leadId,
    type: property ? 'property' : input.type,
    name: input.name,
    phone,
    email: input.email ?? null,
    message: input.message,
    property: property?._id ?? null,
    propertySnapshot: property ? { title: property.title, slug: property.slug } : undefined,
    sourcePage: input.sourcePage ?? null,
    preferredContactTime: input.preferredContactTime ?? null,
    status: spam ? 'spam' : 'new',
    spamScore: spam ? 100 : 0,
    consentAt: new Date(),
    consentText: CONSENT_TEXT,
    ipHash: meta.ipHash,
    userAgent: meta.userAgent?.slice(0, 300),
  });

  if (!spam) {
    void notifyNewLead(`New enquiry ${leadId}${property ? ` — ${property.title}` : ''}`, {
      'Lead ID': leadId,
      Name: input.name,
      Phone: phone,
      Email: input.email,
      Property: property?.title,
      Message: input.message,
      'Preferred time': input.preferredContactTime,
    });
  }
  return { leadId, duplicate: false };
}

export async function listEnquiries(q: z.output<typeof adminEnquiryQuerySchema>) {
  const f = enquiryFilter(q);
  const [rows, total] = await Promise.all([
    Enquiry.find(f)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<EnquiryLean[]>(),
    Enquiry.countDocuments(f),
  ]);
  return { items: rows.map(toDto), meta: paginate(q.page, q.limit, total) };
}

function enquiryFilter(q: z.output<typeof adminEnquiryQuerySchema>): FilterQuery<EnquiryLean> {
  const f: FilterQuery<EnquiryLean> = {};
  if (q.status) f.status = q.status;
  else f.status = { $ne: 'spam' };
  if (q.type) f.type = q.type;
  if (q.propertyId) f.property = q.propertyId;
  if (q.from || q.to) {
    f.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) };
  }
  if (q.followUpDue) {
    f.followUpAt = { $lte: new Date() };
    f.status = { $in: ['new', 'contacted', 'qualified'] };
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    f.$or = [
      { name: rx },
      { phone: rx },
      { email: rx },
      { leadId: rx },
      { 'propertySnapshot.title': rx },
    ];
  }
  return f;
}

export async function getEnquiry(id: string) {
  const e = await Enquiry.findById(id).lean<EnquiryLean>();
  if (!e) throw notFound('Enquiry not found');
  return toDto(e);
}

export async function updateEnquiry(
  id: string,
  patch: z.output<typeof enquiryUpdateSchema>,
  by: string,
) {
  const e = await Enquiry.findById(id);
  if (!e) throw notFound('Enquiry not found');
  if (patch.status) e.status = patch.status;
  if (patch.followUpAt !== undefined) e.followUpAt = patch.followUpAt;
  if (patch.assignedTo !== undefined) e.assignedTo = patch.assignedTo || null;
  if (patch.note) e.notes.push({ text: patch.note, by, at: new Date() });
  await e.save();
  return toDto(e.toObject() as unknown as EnquiryLean);
}

export async function exportEnquiriesCsv(
  q: z.output<typeof adminEnquiryQuerySchema>,
): Promise<string> {
  const rows = await Enquiry.find(enquiryFilter(q))
    .sort({ createdAt: -1 })
    .limit(10_000)
    .lean<EnquiryLean[]>();
  return toCsv(
    [
      'Lead ID',
      'Created',
      'Status',
      'Type',
      'Name',
      'Phone',
      'Email',
      'Property',
      'Message',
      'Follow-up',
      'Assigned to',
      'Latest note',
    ],
    rows.map((e) => [
      e.leadId,
      e.createdAt.toISOString(),
      e.status,
      e.type,
      e.name,
      e.phone,
      e.email,
      e.propertySnapshot?.title,
      e.message,
      e.followUpAt?.toISOString(),
      e.assignedTo,
      e.notes.at(-1)?.text,
    ]),
  );
}

/* ------------------------------------------------------------------ */
/* Landlord property submissions                                       */
/* ------------------------------------------------------------------ */

type SubmissionLean = Omit<SubmissionDto, 'id' | 'createdAt' | 'availableFrom' | 'notes'> & {
  _id: Types.ObjectId;
  createdAt: Date;
  availableFrom?: Date | null;
  notes: { text: string; by: string; at: Date }[];
};

function submissionDto(s: SubmissionLean): SubmissionDto {
  return {
    id: String(s._id),
    leadId: s.leadId,
    ownerName: s.ownerName,
    phone: s.phone,
    email: s.email ?? null,
    relationship: s.relationship,
    category: s.category,
    propertyType: s.propertyType,
    city: s.city,
    locality: s.locality,
    expectedRent: s.expectedRent ?? null,
    areaValue: s.areaValue ?? null,
    areaUnit: s.areaUnit,
    bedrooms: s.bedrooms ?? null,
    furnishingStatus: s.furnishingStatus ?? null,
    availableFrom: s.availableFrom ? s.availableFrom.toISOString() : null,
    description: s.description,
    status: s.status,
    notes: (s.notes ?? []).map((n) => ({
      text: n.text,
      by: n.by,
      at: new Date(n.at).toISOString(),
    })),
    createdAt: s.createdAt.toISOString(),
  };
}

export async function createSubmission(
  input: z.output<typeof propertySubmissionCreateSchema>,
  meta: RequestMeta,
) {
  const phone = await requirePhone(input.phone);
  const spam = looksAutomated(input);
  const leadId = await nextLeadId('L');
  await PropertySubmission.create({
    ...input,
    leadId,
    phone,
    email: input.email ?? null,
    status: spam ? 'spam' : 'new',
    consentAt: new Date(),
    ipHash: meta.ipHash,
    userAgent: meta.userAgent?.slice(0, 300),
  });
  if (!spam) {
    void notifyNewLead(`New property listing request ${leadId}`, {
      'Lead ID': leadId,
      Owner: input.ownerName,
      Phone: phone,
      Email: input.email,
      Property: `${input.propertyType} (${input.category})`,
      Location: `${input.locality}, ${input.city}`,
      'Expected rent': input.expectedRent ? `₹${input.expectedRent}` : undefined,
      Details: input.description,
    });
  }
  return { leadId };
}

export async function listSubmissions(q: {
  status?: string;
  page: number;
  limit: number;
  q?: string;
}) {
  const f: FilterQuery<SubmissionLean> = q.status
    ? { status: q.status }
    : { status: { $ne: 'spam' } };
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    f.$or = [{ ownerName: rx }, { phone: rx }, { locality: rx }, { leadId: rx }];
  }
  const [rows, total] = await Promise.all([
    PropertySubmission.find(f)
      .sort({ createdAt: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean<SubmissionLean[]>(),
    PropertySubmission.countDocuments(f),
  ]);
  return { items: rows.map(submissionDto), meta: paginate(q.page, q.limit, total) };
}

export async function updateSubmission(
  id: string,
  patch: z.output<typeof submissionUpdateSchema>,
  by: string,
) {
  const s = await PropertySubmission.findById(id);
  if (!s) throw notFound('Submission not found');
  if (patch.status) s.status = patch.status;
  if (patch.note) s.notes.push({ text: patch.note, by, at: new Date() });
  await s.save();
  return submissionDto(s.toObject() as unknown as SubmissionLean);
}
