export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gray-200" />
            <div className="h-8 w-56 rounded bg-gray-200" />
          </div>
          <div className="h-4 w-full max-w-xl rounded bg-gray-200" />
        </div>
        <div className="h-20 w-40 rounded-xl bg-gray-200" />
      </div>
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-48 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    </div>
  );
}
