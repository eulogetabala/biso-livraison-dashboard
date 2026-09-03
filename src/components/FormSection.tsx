import { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export default function FormSection({ title, description, children, className }: Props) {
  return (
    <section className={`form-section ${className ?? ''}`.trim()}>
      <div className="form-section-head">
        <h4 className="form-section-title">{title}</h4>
        {description ? <p className="form-section-desc">{description}</p> : null}
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  );
}
