/**
 * Removes every demo listing and the enquiries that point at them.
 * Run before launch:  pnpm demo:remove
 */
import { Property } from '../models/property.model.js';
import { Enquiry, SlugRedirect } from '../models/misc.models.js';
import { runScript } from './run.js';

await runScript('demo:remove', async () => {
  const ids = (await Property.find({ isDemo: true }).select('_id').lean()).map((p) => p._id);
  if (!ids.length) {
    console.warn('No demo listings found.');
    return;
  }
  const enq = await Enquiry.deleteMany({ property: { $in: ids } });
  await SlugRedirect.deleteMany({ property: { $in: ids } });
  const props = await Property.deleteMany({ _id: { $in: ids } });
  console.warn(
    `Removed ${props.deletedCount} demo listings and ${enq.deletedCount} related enquiries.`,
  );
  const leftover = await Property.countDocuments({ 'images.isDemo': true });
  if (leftover)
    console.warn(
      `Warning: ${leftover} non-demo listing(s) still use demo images. Replace them before launch.`,
    );
});
