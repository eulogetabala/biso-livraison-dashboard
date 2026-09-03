import { useRef, useState } from 'react';
import { useAuth } from '../auth';
import { assetUrl, uploadImage } from '../lib/api';

type Props = {
  name?: string;
  coverUrl?: string;
  logoUrl?: string;
  onCoverChange: (url: string) => void;
  onLogoChange: (url: string) => void;
};

export default function RestaurantBrandingUpload({
  name,
  coverUrl,
  logoUrl,
  onCoverChange,
  onLogoChange,
}: Props) {
  const { token } = useAuth();
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(file: File, kind: 'cover' | 'logo') {
    if (!token) return;
    const setUploading = kind === 'cover' ? setUploadingCover : setUploadingLogo;
    const onChange = kind === 'cover' ? onCoverChange : onLogoChange;
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

  return (
    <div className="restaurant-branding">
      <div
        className={`restaurant-branding-cover ${coverUrl ? 'has-image' : ''}`}
        style={coverUrl ? { backgroundImage: `url(${assetUrl(coverUrl)})` } : undefined}
      >
        <div className="restaurant-branding-cover-overlay" />
        <div className="restaurant-branding-cover-actions">
          <button type="button" className="btn btn-sm secondary" disabled={uploadingCover} onClick={() => coverRef.current?.click()}>
            {uploadingCover ? 'Envoi…' : coverUrl ? 'Changer la couverture' : 'Ajouter une couverture'}
          </button>
          {coverUrl ? (
            <button type="button" className="btn btn-sm danger" onClick={() => onCoverChange('')}>
              Retirer
            </button>
          ) : null}
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file, 'cover');
            e.target.value = '';
          }}
        />
      </div>

      <div className="restaurant-branding-logo-wrap">
        <button
          type="button"
          className={`restaurant-branding-logo ${logoUrl ? 'has-image' : ''}`}
          onClick={() => logoRef.current?.click()}
          disabled={uploadingLogo}
        >
          {logoUrl ? (
            <img src={assetUrl(logoUrl)} alt="" />
          ) : (
            <span>{uploadingLogo ? '…' : 'Logo'}</span>
          )}
        </button>
        <div className="restaurant-branding-meta">
          <strong>{name?.trim() || 'Nom du restaurant'}</strong>
          <p className="muted">Logo carré · vignette dans les listes</p>
          <div className="restaurant-branding-logo-actions">
            <button type="button" className="btn btn-sm secondary" disabled={uploadingLogo} onClick={() => logoRef.current?.click()}>
              {uploadingLogo ? 'Envoi…' : logoUrl ? 'Remplacer le logo' : 'Choisir le logo'}
            </button>
            {logoUrl ? (
              <button type="button" className="btn btn-sm danger" onClick={() => onLogoChange('')}>
                Retirer
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file, 'logo');
            e.target.value = '';
          }}
        />
      </div>

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
