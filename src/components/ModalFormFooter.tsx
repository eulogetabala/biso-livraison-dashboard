type Props = {
  formId: string;
  onCancel: () => void;
  saving?: boolean;
  submitLabel?: string;
};

export default function ModalFormFooter({ formId, onCancel, saving, submitLabel = 'Enregistrer' }: Props) {
  return (
    <div className="modal-footer-actions">
      <button type="button" className="btn secondary" onClick={onCancel}>
        Annuler
      </button>
      <button type="submit" form={formId} className="btn" disabled={saving}>
        {saving ? 'Enregistrement…' : submitLabel}
      </button>
    </div>
  );
}
