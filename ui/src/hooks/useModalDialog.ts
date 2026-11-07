import { useEffect, useRef } from 'react';

/**
 * Opens a native `<dialog>` with `showModal()` on mount and closes it on
 * unmount so focus returns to the previously focused trigger.
 */
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return undefined;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();

    return () => {
      if (dialog.open) {
        dialog.close();
      }
      previouslyFocused?.focus();
    };
  }, []);

  return ref;
}
