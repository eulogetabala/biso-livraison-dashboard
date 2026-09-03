import { ReactNode } from 'react';

type Props = {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
};

export default function Field({ label, hint, required, children }: Props) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required ? <span className="field-required"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
