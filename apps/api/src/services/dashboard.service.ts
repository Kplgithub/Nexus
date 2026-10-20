import type { DashboardStats } from '@nexus/shared';
import { Property } from '../models/property.model.js';
import { Enquiry, PropertySubmission } from '../models/misc.models.js';

export async function getDashboard(): Promise<DashboardStats> {
  const [byStatus, demo, enqByStatus, followUpsDue, newSubs, recentProps, recentEnq] = await Promise.all([
    Property.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Property.countDocuments({ isDemo: true }),
    Enquiry.aggregate<{ _id: string; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Enquiry.countDocuments({ followUpAt: { $lte: new Date() }, status: { $in: ['new', 'contacted', 'qualified'] } }),
    PropertySubmission.countDocuments({ status: 'new' }),
    Property.find().sort({ createdAt: -1 }).limit(6).select('title slug status monthlyRent createdAt').lean(),
    Enquiry.find({ status: { $ne: 'spam' } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('leadId name status createdAt property propertySnapshot')
      .lean(),
  ]);
  const ps = Object.fromEntries(byStatus.map((r) => [r._id, r.n])) as Record<string, number>;
  const es = Object.fromEntries(enqByStatus.map((r) => [r._id, r.n])) as Record<string, number>;
  const sum = (o: Record<string, number>, skip: string[] = []) =>
    Object.entries(o).reduce((a, [k, v]) => (skip.includes(k) ? a : a + v), 0);

  return {
    properties: {
      total: sum(ps),
      published: ps.published ?? 0,
      draft: ps.draft ?? 0,
      rented: ps.rented ?? 0,
      inactive: ps.inactive ?? 0,
      archived: ps.archived ?? 0,
      demo,
    },
    enquiries: {
      total: sum(es, ['spam']),
      new: es.new ?? 0,
      contacted: es.contacted ?? 0,
      qualified: es.qualified ?? 0,
      followUpsDue,
    },
    submissions: { new: newSubs },
    recentProperties: recentProps.map((p) => ({
      id: String(p._id),
      title: p.title,
      slug: p.slug,
      status: p.status as DashboardStats['recentProperties'][number]['status'],
      monthlyRent: p.monthlyRent,
      createdAt: (p.createdAt as Date).toISOString(),
    })),
    recentEnquiries: recentEnq.map((e) => ({
      id: String(e._id),
      leadId: e.leadId,
      name: e.name,
      status: e.status as DashboardStats['recentEnquiries'][number]['status'],
      createdAt: (e.createdAt as Date).toISOString(),
      property:
        e.property && e.propertySnapshot?.slug
          ? { id: String(e.property), title: e.propertySnapshot.title ?? '', slug: e.propertySnapshot.slug }
          : null,
    })),
  };
}
