import { PanelAction } from './PanelAction';
import { useI18n } from '../../i18n/useI18n';
import { useModalDialog } from '../../hooks/useModalDialog';

interface ClearSessionDialogProps {
  profileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClearSessionDialog({ profileName, onConfirm, onCancel }: ClearSessionDialogProps) {
  const { t } = useI18n();
  const dialogRef = useModalDialog();

  return (
    <dialog
      ref={dialogRef}
      className="clear-session-modal"
      aria-modal="true"
      aria-labelledby="clear-session-title"
      aria-describedby="clear-session-detail"
      onCancel={onCancel}
    >
      <div className="clear-session-modal__dialog">
        <span id="clear-session-title" className="clear-session-modal__title">
          {t('clearSession.confirm', { name: profileName })}
        </span>
        <p id="clear-session-detail" className="clear-session-dialog__detail">
          {t('clearSession.detail', { name: profileName })}
        </p>
        <div className="clear-session-modal__actions">
          <PanelAction variant="danger" autoFocus onClick={onConfirm}>
            {t('app.clearSession')}
          </PanelAction>
          <PanelAction variant="secondary" onClick={onCancel}>
            {t('shutdown.cancel')}
          </PanelAction>
        </div>
      </div>
    </dialog>
  );
}
