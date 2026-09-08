import { FormEvent, useState } from 'react';
import { useMutation } from '@apollo/client';
import { UPSERT_CUISINE } from '../graphql/admin';
import { apolloErrorMessage } from '../lib/apollo-error';
import { slugCuisineValue, type CuisineOption } from '../lib/cuisine-types';
import { assetUrl } from '../lib/api';

type Props = {
  cuisines: CuisineOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onCuisinesUpdated?: () => void;
};

export default function CuisineTypePicker({
  cuisines,
  selected,
  onChange,
  onCuisinesUpdated,
}: Props) {
  const [upsertCuisine] = useMutation(UPSERT_CUISINE);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);

  function toggle(value: string) {
    const upper = value.toUpperCase();
    if (selected.includes(upper)) {
      onChange(selected.filter((item) => item !== upper));
      return;
    }
    onChange([...selected, upper]);
  }

  async function onAddType(event: FormEvent) {
    event.preventDefault();
    const label = newLabel.trim();
    if (!label) return;

    setSaving(true);
    setAddError('');
    const value = slugCuisineValue(label);

    try {
      await upsertCuisine({
        variables: {
          input: {
            value,
            label,
            sortOrder: cuisines.length + 1,
            isActive: true,
          },
        },
      });
      onCuisinesUpdated?.();
      if (!selected.includes(value)) {
        onChange([...selected, value]);
      }
      setNewLabel('');
      setAdding(false);
    } catch (err) {
      setAddError(apolloErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cuisine-picker">
      <div className="cuisine-picker-grid">
        {cuisines.map((cuisine) => {
          const active = selected.includes(cuisine.value.toUpperCase());
          return (
            <button
              key={cuisine.value}
              type="button"
              className={`cuisine-chip ${active ? 'active' : ''}`}
              onClick={() => toggle(cuisine.value)}
            >
              {cuisine.iconUrl ? (
                <span className="cuisine-chip-icon">
                  <img src={assetUrl(cuisine.iconUrl)} alt="" />
                </span>
              ) : null}
              <span>{cuisine.label}</span>
              {active ? <span className="cuisine-chip-check">✓</span> : null}
            </button>
          );
        })}
      </div>

      {selected.length === 0 ? (
        <p className="field-hint cuisine-picker-hint">Sélectionnez au moins un type de cuisine.</p>
      ) : (
        <p className="field-hint cuisine-picker-hint">
          {selected.length} type{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}.
        </p>
      )}

      {!adding ? (
        <button type="button" className="btn btn-ghost cuisine-add-toggle" onClick={() => setAdding(true)}>
          + Ajouter un nouveau type
        </button>
      ) : (
        <form className="cuisine-add-form" onSubmit={onAddType}>
          <input
            placeholder="Nom du type, ex. Grillades"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-sm" disabled={saving}>
            {saving ? '…' : 'Créer'}
          </button>
          <button
            type="button"
            className="btn btn-sm secondary"
            onClick={() => {
              setAdding(false);
              setAddError('');
            }}
          >
            Annuler
          </button>
          <p className="field-hint form-span-2">
            Ajoutez l&apos;icône depuis la rubrique <strong>Types de cuisine</strong>.
          </p>
          {addError ? <p className="field-error form-span-2">{addError}</p> : null}
        </form>
      )}
    </div>
  );
}
