/**
 * A section's heading in the site's HUD language: the index numeral, the
 * `h2`, a hairline running out to the edge, and a telemetry caption. The
 * rules are the home page's (`styles/hud.css`, `.hud-section-header`).
 */

import Hairline from '@/components/hud/Hairline';

export interface SectionHeadingProps {
  id: string;
  index: string;
  title: string;
  caption: string;
}

export default function SectionHeading({ id, index, title, caption }: SectionHeadingProps) {
  return (
    <header className="hud-section-header">
      <div className="hud-section-header__row">
        <span className="hud-section-header__index" aria-hidden="true">
          {index}
        </span>
        <h2 className="hud-section-header__title" id={id}>
          {title}
        </h2>
        <Hairline fade="end" className="hud-section-header__rule" />
      </div>
      <p className="hud-section-header__caption">{caption}</p>
    </header>
  );
}
