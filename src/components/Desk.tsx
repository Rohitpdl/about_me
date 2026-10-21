import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import Diary from './Diary';
import { closeJournal, useWorldStore } from '../scenes/store';

type DeskProps = {
  overlay: 'desk' | 'diary';
  reducedMotion: boolean;
  initialSpread?: number;
  onCloseStart: () => void;
  onClose: () => void;
};

export default function Desk({ overlay, reducedMotion, initialSpread, onCloseStart, onClose }: DeskProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState(false);
  const [textureFallback, setTextureFallback] = useState(false);
  const isDiary = overlay === 'diary';

  useEffect(() => {
    let cancelled = false;
    const textures = ['/assets/textures/wood.jpg', '/assets/textures/leather.jpg'];
    void Promise.all(textures.map((source) => new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => {
        console.warn(`[desk] Texture failed to load: ${source}`);
        resolve(false);
      };
      image.src = source;
    }))).then((loaded) => {
      if (!cancelled) setTextureFallback(loaded.some((result) => !result));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isDiary) bookRef.current?.focus();
  }, [isDiary]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const close = useCallback(() => {
    if (closing) return;
    onCloseStart();
    if (reducedMotion) {
      closeJournal();
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('.projects-neon-sign')?.focus();
      }, 0);
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      onClose();
      window.setTimeout(() => {
        document.querySelector<HTMLButtonElement>('.projects-neon-sign')?.focus();
      }, 0);
    }, 440);
  }, [closing, onClose, onCloseStart, reducedMotion]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isDiary) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = rootRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleCoverAnimationEnd = () => {
    if (opening) {
      setOpening(false);
      useWorldStore.getState().setOverlay('diary');
    }
  };

  return (
    <div
      ref={rootRef}
      className={`desk-overlay${closing ? ' is-closing' : ''}${isDiary ? ' has-diary' : ''}${textureFallback ? ' has-desk-texture-fallback' : ''}`}
      role={isDiary ? undefined : 'dialog'}
      aria-modal={isDiary ? undefined : true}
      aria-label={isDiary ? undefined : 'The journal desk'}
      onKeyDown={onKeyDown}
    >
      <div className="desk-room" aria-hidden={isDiary}>
        <div className="desk-lamp-glow" aria-hidden="true" />
        <div className="desk-dust" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => (
            <i key={index} style={{ '--dust-index': index } as CSSProperties} />
          ))}
        </div>
        <div className="desk-table-perspective" aria-hidden="true">
          <div className="desk-table-surface" />
        </div>
        <svg className="desk-prop desk-pencil" viewBox="0 0 24 210" aria-hidden="true">
          <path d="M12 3 19 18 17 183 12 205 7 183 5 18Z" fill="#b87932" stroke="#4c2e1b" strokeWidth="2" />
          <path d="M7 18h10M8 27h8" stroke="#e3b86c" strokeWidth="2" />
          <path d="m9 193 3 12 3-12" fill="#d9c8aa" stroke="#594b3d" strokeWidth="1.5" />
        </svg>
        <svg className="desk-prop desk-cup" viewBox="0 0 150 130" aria-hidden="true">
          <ellipse cx="62" cy="105" rx="48" ry="13" fill="#140f0d" opacity=".65" />
          <path d="M27 33h73l-8 59q-3 15-28 15T36 92Z" fill="#d1c1a5" stroke="#5c4939" strokeWidth="4" />
          <path d="M99 46h17q23 1 15 25-5 16-31 13" fill="none" stroke="#b29e80" strokeWidth="9" />
          <ellipse cx="63" cy="35" rx="37" ry="10" fill="#4b2d1e" stroke="#d1c1a5" strokeWidth="5" />
          <path d="M46 25q-12-15 0-26M68 25q-11-14 1-25" fill="none" stroke="#e4d5bb" strokeWidth="3" opacity=".45" />
        </svg>
        <svg className="desk-prop desk-paper" viewBox="0 0 220 160" aria-hidden="true">
          <path d="m15 30 43 7 24-18 28 14 34-11 54 25-8 69-37 19-39-14-37 15-27-17-31 3-20-40Z" fill="#b9ae92" />
          <path d="m15 30 43 7 24-18 28 14 34-11 54 25-8 69-37 19-39-14-37 15-27-17-31 3-20-40Z" fill="none" stroke="#655b48" strokeWidth="3" />
          <path d="m48 56 105 14M44 72l91 13m-79 10 63 10" stroke="#706652" strokeWidth="3" opacity=".5" />
        </svg>
        <div className={`journal-book${opening ? ' is-opening' : ''}${isDiary ? ' is-open' : ''}`}>
          <div className="journal-pages" aria-hidden="true" />
          <button
            ref={bookRef}
            className="journal-cover"
            type="button"
            aria-label="Open the journal"
            disabled={isDiary || opening || closing}
            tabIndex={isDiary ? -1 : 0}
            onClick={() => {
              if (reducedMotion) useWorldStore.getState().setOverlay('diary');
              else setOpening(true);
            }}
            onAnimationEnd={handleCoverAnimationEnd}
          >
            <span className="journal-cover-face journal-cover-outer" aria-hidden="true">
              <span className="journal-cover-title">FIELD<br />JOURNAL</span>
              <span className="journal-cover-mark">✳</span>
              <span className="journal-cover-strap" />
            </span>
            <span className="journal-cover-face journal-cover-inner" aria-hidden="true" />
            {!isDiary && !opening && <span className="journal-open-prompt" aria-hidden="true">OPEN</span>}
          </button>
          <div className="journal-spine" aria-hidden="true" />
        </div>
        <button type="button" className="desk-back-button" onClick={close} disabled={closing}>
          Back to the street
        </button>
      </div>
      {isDiary && <div className="desk-diary-scrim" aria-hidden="true" />}
      <div className="desk-entry-wash" aria-hidden="true" />
      {isDiary && <Diary reducedMotion={reducedMotion} initialSpread={initialSpread} onBack={() => useWorldStore.getState().setOverlay('desk')} />}
    </div>
  );
}
