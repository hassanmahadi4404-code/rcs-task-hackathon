/**
 * One control inside a repeated-row card (`admin-row`), labelled and tied to
 * its column's hint and the row's rejection — issue #10, shared with the
 * working plan form (#65). The hint is printed under the first row's field
 * only; every other row points at it by id.
 */

export interface RowFieldProps {
  /** The form field name, repeated once per row. */
  name: string;
  id: string;
  label: string;
  value: string;
  /** The column's shared hint, and the row's rejection if it has one. */
  describedBy?: string;
  /** The column's hint, printed under the first row's field only. */
  hint?: { id: string; text: string };
  options?: readonly string[];
}

export default function RowField({ name, id, label, value, describedBy, hint, options }: RowFieldProps) {
  const shared = {
    className: 'admin-field__input',
    id,
    name,
    defaultValue: value,
    'aria-describedby': describedBy,
  };

  return (
    <p className="admin-field">
      <label className="admin-field__label" htmlFor={id}>
        {label}
      </label>
      {options ? (
        <select {...shared}>
          <option value="" />
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input {...shared} type="text" />
      )}
      {hint?.text && (
        <span className="admin-field__hint" id={hint.id}>
          {hint.text}
        </span>
      )}
    </p>
  );
}
