'use client';

import {
  type RefObject,
  useEffect,
  useRef,
} from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useDialogFocus(
  active: boolean,
  onEscape: () => void,
): RefObject<HTMLElement | null> {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const initialFocusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      ),
    );

    initialFocusable.at(0)?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') {
        return;
    }

    const activeDialog = dialogRef.current;

    if (!activeDialog) {
        return;
    }

    const currentFocusable = Array.from(
        activeDialog.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTOR,
        ),
    );

      const first = currentFocusable.at(0);
      const last = currentFocusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );

      document.body.style.overflow =
        previousOverflow;

      previouslyFocused?.focus();
    };
  }, [active, onEscape]);

  return dialogRef;
}