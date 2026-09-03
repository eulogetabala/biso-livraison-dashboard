import { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionCard({ title, subtitle, children, className }: Props) {
  return (
    <section className={`card section-card ${className ?? ''}`.trim()}>
      <div className="section-card-header">
        <h3>{title}</h3>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
