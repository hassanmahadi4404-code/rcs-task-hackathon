/**
 * The signed-out screens — issue #21: sign-in and "not invited". The mark
 * and one framed panel over the site's grid plane; no shell, because there
 * is nobody to show a menu to yet.
 */

import LogoMark from '@/components/brand/LogoMark';
import Frame from '@/components/hud/Frame';
import GridPlane from '@/components/hud/GridPlane';

export interface GatePanelProps {
  eyebrow: string;
  title: string;
  lede: string;
  accent?: boolean;
  children: React.ReactNode;
}

export default function GatePanel({ eyebrow, title, lede, accent, children }: GatePanelProps) {
  return (
    <main className="admin-gate" id="main-content" tabIndex={-1}>
      <GridPlane scale="base" mask="radial" accent={accent} />
      <div className="admin-gate__inner">
        <LogoMark className="admin-gate__mark logo-on-dark" />
        <Frame size="md" accent={accent} className="admin-gate__panel">
          <p className="admin-eyebrow">{eyebrow}</p>
          <h1 className="admin-title">{title}</h1>
          <p className="admin-gate__lede">{lede}</p>
          {children}
        </Frame>
      </div>
    </main>
  );
}
