/**
 * One button in its own form — issue #21, busy while it works since #31.
 *
 * Every row control is this: the row's values as hidden fields, posted to a
 * server action. A form each, because a nested form is invalid HTML and a
 * `formAction` on a shared form would not carry the row's own values. The
 * button is a `SubmitButton`: disabled and busy until the server answers,
 * asking first with `confirm`, and named by `label` when it shows an `icon`.
 */

import SubmitButton from '@/components/admin/SubmitButton';

export interface PostButtonProps {
  action: (formData: FormData) => Promise<void>;
  /** Hidden fields; an `undefined` value is left out. */
  fields: Record<string, string | undefined>;
  label: string;
  className: string;
  icon?: React.ReactNode;
  confirm?: string;
  disabled?: boolean;
}

export default function PostButton({ action, fields, ...button }: PostButtonProps) {
  return (
    <form action={action}>
      {Object.entries(fields).map(
        ([name, value]) =>
          value !== undefined && <input key={name} type="hidden" name={name} value={value} />,
      )}
      <SubmitButton {...button} />
    </form>
  );
}
