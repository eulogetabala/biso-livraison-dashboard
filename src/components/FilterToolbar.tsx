import type { DateRangePreset } from '../lib/format';

export type FilterOption = { value: string; label: string };

const PERIOD_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: 'all', label: 'Toute la période' },
  { id: '7d', label: '7 derniers jours' },
  { id: '14d', label: '14 derniers jours' },
  { id: '30d', label: '30 derniers jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'year', label: 'Cette année' },
  { id: 'custom', label: 'Personnalisé' },
];

type Props = {
  showPeriod?: boolean;
  preset: DateRangePreset;
  customFrom: string;
  customTo: string;
  onPresetChange: (preset: DateRangePreset) => void;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  typeFilter?: string;
  typeOptions?: readonly FilterOption[];
  onTypeChange?: (value: string) => void;
  statusFilter?: string;
  statusOptions?: readonly FilterOption[];
  onStatusChange?: (value: string) => void;
};

export default function FilterToolbar({
  showPeriod = true,
  preset,
  customFrom,
  customTo,
  onPresetChange,
  onFromChange,
  onToChange,
  typeFilter,
  typeOptions,
  onTypeChange,
  statusFilter,
  statusOptions,
  onStatusChange,
}: Props) {
  return (
    <div className="filter-toolbar">
      {showPeriod ? (
        <>
          <div className="filter-field">
            <label htmlFor="filter-period">Période</label>
            <select
              id="filter-period"
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as DateRangePreset)}
            >
              {PERIOD_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {preset === 'custom' ? (
            <>
              <div className="filter-field filter-field--date">
                <label htmlFor="filter-from">Du</label>
                <input
                  id="filter-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => onFromChange(e.target.value)}
                />
              </div>
              <div className="filter-field filter-field--date">
                <label htmlFor="filter-to">Au</label>
                <input
                  id="filter-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => onToChange(e.target.value)}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {typeOptions && onTypeChange != null ? (
        <div className="filter-field">
          <label htmlFor="filter-type">Type</label>
          <select
            id="filter-type"
            value={typeFilter ?? ''}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            {typeOptions.map((item) => (
              <option key={item.value || 'all-type'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {statusOptions && onStatusChange != null ? (
        <div className="filter-field">
          <label htmlFor="filter-status">Statut</label>
          <select
            id="filter-status"
            value={statusFilter ?? ''}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {statusOptions.map((item) => (
              <option key={item.value || 'all-status'} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
