interface SkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 5 }: SkeletonProps) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <div className="h-3 bg-slate-700 rounded animate-pulse w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j}>
                  <div className="h-4 bg-slate-700/50 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card">
      <div className="h-4 bg-slate-700 rounded animate-pulse w-1/3 mb-4" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-700/50 rounded animate-pulse" />
        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-5/6" />
        <div className="h-3 bg-slate-700/50 rounded animate-pulse w-4/6" />
      </div>
    </div>
  );
}
