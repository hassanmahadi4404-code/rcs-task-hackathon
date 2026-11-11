/** A list with nothing in it — issue #21. One line, and optionally what to do next. */

export default function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="admin-empty">{children}</div>;
}
