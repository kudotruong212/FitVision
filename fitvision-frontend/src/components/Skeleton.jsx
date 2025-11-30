// components/Skeleton.jsx
// Skeleton loading component

export default function Skeleton({ className = '', lines = 1 }) {
  if (lines === 1) {
    return (
      <div className={`animate-pulse bg-slate-700 rounded ${className}`} />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-slate-700 rounded ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          } ${className}`}
        />
      ))}
    </div>
  );
}



