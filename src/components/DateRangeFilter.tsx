import type { DateRangePreset } from '../lib/format';

type Props = {
  preset: DateRangePreset;
  from: string;
  to: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
};

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'all', label: 'Toute la période' },
  { id: '7d', label: '7 jours' },
  { id: '14d', label: '14 jours' },
  { id: '30d', label: '30 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'year', label: 'Cette année' },
  { id: 'custom', label: 'Personnalisé' },
];

export default function DateRangeFilter({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
}: Props) {
  return (
    <div className="date-range-filter">
      <div className="date-range-presets">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={preset === item.id ? 'active' : ''}
            onClick={() => onPresetChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="date-range-custom">
          <label>
            <span>Du</span>
            <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
          </label>
          <label>
            <span>Au</span>
            <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
