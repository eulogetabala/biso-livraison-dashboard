import { useRef, useState } from 'react';
import { useAuth } from '../auth';
import { assetUrl, uploadImage } from '../lib/api';
import Field from './Field';

type Variant = 'default' | 'cover' | 'logo' | 'banner' | 'product';

type Props = {
  label: string;
  hint?: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  variant?: Variant;
};

export default function ImageUpload({
  label,
  hint,
  value,
  onChange,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
  variant = 'default',
}: Props) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    if (!token) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file, token);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload impossible');
    } finally {
      setUploading(false);
    }
  }

  const previewClass = ['image-upload-preview', `image-upload-preview--${variant}`].join(' ');

  return (
    <Field label={label} hint={hint}>
      <div className={`image-upload image-upload--${variant}`}>
        <div className={previewClass}>
          {value ? (
            <img src={assetUrl(value)} alt="" className="image-upload-thumb" />
          ) : (
            <div className="image-upload-placeholder">
              {variant === 'cover' ? 'Couverture' : variant === 'logo' ? 'Logo' : variant === 'product' ? 'Produit' : 'Aperçu'}
            </div>
          )}
        </div>
        <div className="image-upload-actions">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
          <button type="button" className="btn secondary btn-sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Envoi…' : value ? 'Remplacer' : 'Choisir une image'}
          </button>
          {value ? (
            <button type="button" className="btn danger btn-sm" onClick={() => onChange('')}>
              Retirer
            </button>
          ) : null}
        </div>
        {error ? <p className="field-error">{error}</p> : null}
      </div>
    </Field>
  );
}
