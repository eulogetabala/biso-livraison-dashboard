import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  loading?: boolean;
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'default', loading }: Props) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card-top">
        <span className="stat-card-icon-wrap" aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
        <p className="stat-card-label">{label}</p>
      </div>
      <p className="stat-card-value">{loading ? '…' : value}</p>
      {hint ? <p className="stat-card-hint">{hint}</p> : null}
    </article>
  );
}
