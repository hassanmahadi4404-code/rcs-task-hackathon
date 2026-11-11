/**
 * One part of a long form — issue #21. Once the content column is 640px
 * wide (a 1024px screen) the title and the description sit on the left and
 * the fields on the right; below that they stack. `description` may be a node, for a list of the hints the fields
 * share.
 */

export interface FormSectionProps {
  id: string;
  title: string;
  description?: React.ReactNode;
  /** Take the whole column, for a working section rather than a form. */
  wide?: boolean;
  children: React.ReactNode;
}

export default function FormSection({ id, title, description, wide, children }: FormSectionProps) {
  return (
    <section className="admin-section" aria-labelledby={id} data-wide={wide || undefined}>
      <div className="admin-section__intro">
        <h2 className="admin-section__title" id={id}>
          {title}
        </h2>
        {description && <div className="admin-section__description">{description}</div>}
      </div>
      <div className="admin-section__fields">{children}</div>
    </section>
  );
}
