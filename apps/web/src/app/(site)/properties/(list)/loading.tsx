import { PropertyGridSkeleton } from '@/components/property/PropertyCard';

export default function Loading() {
  return (
    <div className="container-page pt-8" aria-busy="true" aria-label="Loading properties">
      <div className="skeleton h-4 w-40" />
      <div className="skeleton mt-6 h-9 w-72" />
      <div className="skeleton mt-3 h-5 w-96 max-w-full" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <div className="skeleton hidden h-[32rem] lg:block" />
        <PropertyGridSkeleton />
      </div>
    </div>
  );
}
