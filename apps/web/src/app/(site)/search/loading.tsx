export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Searching">
      <div className="bg-brand-900">
        <div className="container-page pb-10 pt-6">
          <div className="skeleton h-4 w-40 opacity-30" />
          <div className="skeleton mt-6 h-9 w-72 max-w-full opacity-30" />
          <div className="skeleton mt-4 h-12 w-full max-w-2xl rounded-2xl opacity-30" />
          <div className="skeleton mt-4 h-24 w-full max-w-2xl rounded-2xl opacity-20" />
        </div>
      </div>
      <div className="container-page space-y-4 pt-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-56 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
