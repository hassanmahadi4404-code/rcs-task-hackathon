/**
 * A list's groups, with counts — issue #21. Each group with entries is a
 * jump link to its section; an empty one is shown with its zero and nothing
 * else, and its section is not rendered at all.
 */

export interface GroupCount {
  id: string;
  label: string;
  count: number;
}

export default function GroupCounts({ label, groups }: { label: string; groups: GroupCount[] }) {
  return (
    <nav className="admin-counts" aria-label={label}>
      <ul>
        {groups.map((group) => (
          <li key={group.id}>
            {group.count > 0 ? (
              <a href={`#group-${group.id}`}>
                {group.label} <span className="admin-counts__n">{group.count}</span>
              </a>
            ) : (
              <span>
                {group.label} <span className="admin-counts__n">{group.count}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
