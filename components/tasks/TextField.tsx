/**
 * One labelled control in a dashboard form: an input, a textarea (`rows`) or
 * a select (`options`), with its hint and its error tied to it for assistive
 * tech. The classes are the dashboard's (`styles/admin.css`, forms).
 */

export interface TextFieldProps {
  name: string;
  label: string;
  hint?: string;
  /** The sentence for what is wrong, when something is. */
  error?: string;
  defaultValue?: string;
  type?: 'text' | 'email' | 'date' | 'datetime-local' | 'number';
  /** Makes it a textarea. */
  rows?: number;
  /** Makes it a select. */
  options?: { value: string; label: string }[];
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  onChange?: (value: string) => void;
}

export default function TextField({
  name,
  label,
  hint,
  error,
  defaultValue = '',
  type = 'text',
  rows,
  options,
  onChange,
  ...rest
}: TextFieldProps) {
  const id = `field-${name}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  const shared = {
    className: 'admin-field__input',
    id,
    name,
    defaultValue,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    ...rest,
  };

  return (
    <p className="admin-field" data-invalid={error ? true : undefined}>
      <label className="admin-field__label" htmlFor={id}>
        {label}
      </label>
      {options ? (
        <select {...shared}>
          <option value="" />
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : rows ? (
        <textarea {...shared} rows={rows} onChange={onChange && ((event) => onChange(event.currentTarget.value))} />
      ) : (
        <input {...shared} type={type} />
      )}
      {hint && (
        <span className="admin-field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="admin-field__note" data-error id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </p>
  );
}
