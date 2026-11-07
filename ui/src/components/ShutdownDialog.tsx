import { ProgressIndicator } from './ProgressIndicator';
import { useI18n } from '../i18n/useI18n';
import { useModalDialog } from '../hooks/useModalDialog';

export type ShutdownState = 'confirm' | 'pending' | 'error';

interface ShutdownDialogProps {
  state: ShutdownState;
  onConfirm: () => void;
  onCancel: () => void;
  onSleep: () => void;
}

export function ShutdownDialog({ state, onConfirm, onCancel, onSleep }: ShutdownDialogProps) {
  const { t } = useI18n();
  const dialogRef = useModalDialog();
  const hasError = state === 'error';
  const pending = state === 'pending';

  return (
    <dialog
      ref={dialogRef}
      className={`shutdown-dialog${pending ? ' shutdown-dialog--pending' : ''}`}
      aria-modal="true"
      aria-label={pending ? t('shutdown.pendingAria') : undefined}
      aria-labelledby={pending ? undefined : 'shutdown-dialog-title'}
      onCancel={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        onCancel();
      }}
    >
      {pending ? (
        <ProgressIndicator variant="dialog" title={t('shutdown.pendingTitle')} detail={t('shutdown.pendingDetail')} />
      ) : (
        <>
          <p id="shutdown-dialog-title">{hasError ? t('shutdown.error') : t('shutdown.confirm')}</p>
          {hasError ? <span className="shutdown-dialog__error">{t('shutdown.errorDetail')}</span> : null}
          <div className="shutdown-dialog__buttons">
            <button type="button" className="shutdown-dialog__cancel" onClick={onSleep} disabled={hasError}>
              {t('shutdown.sleep')}
            </button>
            <button type="button" className="shutdown-dialog__confirm" onClick={onConfirm} autoFocus>
              {hasError ? t('shutdown.tryAgain') : t('shutdown.shutDown')}
            </button>
            <button type="button" className="shutdown-dialog__cancel" onClick={onCancel}>
              {t('shutdown.cancel')}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}
