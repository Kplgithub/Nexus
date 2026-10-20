export default function Loading() {
  return (
    <div className="container-page pt-6" aria-busy="true" aria-label="Loading property">
      <div className="skeleton h-4 w-64" />
      <div className="skeleton mt-5 aspect-[16/9] w-full md:aspect-[21/9]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <div className="skeleton h-10 w-3/4" />
          <div className="skeleton h-5 w-1/2" />
          <div className="skeleton h-9 w-40" />
          <div className="skeleton h-40 w-full" />
        </div>
        <div className="skeleton h-96" />
      </div>
    </div>
  );
}
