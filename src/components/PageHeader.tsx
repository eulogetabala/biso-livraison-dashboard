import { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  badge?: string | number;
};

export default function PageHeader({ title, subtitle, action, badge }: Props) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        <div className="page-header-title-row">
          <h2>{title}</h2>
          {badge != null ? <span className="page-header-badge">{badge}</span> : null}
        </div>
        {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="page-header-action">{action}</div> : null}
    </header>
  );
}
