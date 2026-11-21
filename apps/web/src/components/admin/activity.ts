import type { ActivityItem } from '@nexus/shared';

const ENTITY: Record<string, string> = {
  property: 'listing',
  project: 'project',
  enquiry: 'lead',
  user: 'website user',
  team: 'team member',
  blog: 'blog post',
  city: 'location',
  settings: 'site settings',
  alerts: 'alert settings',
  visit: 'site visit',
  plan: 'plan',
  payment: 'payment',
  report: 'report',
  image: 'photos',
  admin: 'account',
};

const VERB: Record<string, string> = {
  create: 'added',
  update: 'edited',
  delete: 'deleted',
  import: 'imported',
  upload: 'uploaded',
  export: 'exported',
  publish: 'published',
  assign: 'assigned',
  unassign: 'unassigned',
  deactivate: 'switched off',
  activate: 'switched on',
  'set-password': 'set a new password for',
  'change-password': 'changed the password of',
  login: 'signed in to',
  'logout-all': 'signed out everywhere from',
  record: 'recorded',
  refund: 'refunded',
  unfeature: 'removed from featured',
  scheduled: 'scheduled',
  rescheduled: 'rescheduled',
  done: 'marked done',
  cancelled: 'cancelled',
  'no-show': 'marked no-show',
};

/** "approved the listing “2 BHK…”" — a readable sentence for one audit row. */
export function describeActivity(a: ActivityItem): string {
  const thing = ENTITY[a.entity] ?? a.entity;
  const [verb, arg] = a.action.split(':');
  let text: string;
  if (verb === 'status' && arg) {
    const named: Record<string, string> = {
      published: 'approved',
      rejected: 'rejected',
      archived: 'archived',
      inactive: 'took down',
      contacted: 'marked as contacted',
      qualified: 'marked as qualified',
      closed: 'closed',
      spam: 'marked as spam',
    };
    text = `${named[arg] ?? `set to ${arg}`} the ${thing}`;
  } else if (verb === 'verify' && arg) {
    text =
      arg === 'verified'
        ? 'verified'
        : arg === 'rejected'
          ? 'rejected verification of'
          : 'reset verification of';
  } else if (verb === 'feature' && arg) {
    text = `featured the ${thing} for ${arg.replace('d', ' days')}`;
  } else if (verb === 'report' && arg) {
    text = `${arg} a report on`;
  } else {
    text = `${VERB[verb!] ?? verb} the ${thing}`;
  }
  if (verb === 'verify') text += ' the profile';
  return a.summary ? `${text} “${a.summary}”` : text;
}
