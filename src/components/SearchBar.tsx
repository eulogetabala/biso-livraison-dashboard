type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function SearchBar({ value, onChange, placeholder = 'Rechercher…' }: Props) {
  return (
    <div className="search-bar">
      <span className="search-bar-icon" aria-hidden>⌕</span>
      <input
        className="search-bar-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="search-bar-clear" onClick={() => onChange('')} aria-label="Effacer">
          ×
        </button>
      ) : null}
    </div>
  );
}
