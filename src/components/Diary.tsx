import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { portfolioContent, type PortfolioProject } from '../data/content';
import { emit } from '../lib/events';

type DiaryProps = {
  reducedMotion: boolean;
  onBack: () => void;
};

type SketchState =
  | { kind: 'svg'; viewBox: string; paths: string[] }
  | { kind: 'raster'; url: string }
  | { kind: 'error' }
  | null;

const projects = portfolioContent.projects;
const repoUrl = portfolioContent.links.github;

function parseSketch(source: string): { viewBox: string; paths: string[] } {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (document.querySelector('parsererror')) throw new Error('Invalid sketch SVG');
  const root = document.documentElement;
  const viewBox = root.getAttribute('viewBox') ?? '0 0 640 460';
  const paths = [...root.querySelectorAll('path')].flatMap((path) => {
    const d = path.getAttribute('d') ?? '';
    return /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(d) ? [d] : [];
  });
  if (paths.length === 0) throw new Error('Sketch SVG has no supported paths');
  return { viewBox, paths };
}

function useSketch(sketch: string, active: boolean): SketchState {
  const [loaded, setLoaded] = useState<SketchState>(null);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setLoaded(null);

    void fetch(sketch, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const text = await blob.text();
        const containsSvg = /<svg(?:\s|>)/i.test(text.slice(0, 2048));
        if ((blob.type.startsWith('image/') && blob.type !== 'image/svg+xml') || !containsSvg) {
          objectUrl = URL.createObjectURL(blob);
          setLoaded({ kind: 'raster', url: objectUrl });
          return;
        }
        const parsed = parseSketch(text);
        setLoaded({ kind: 'svg', ...parsed });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn(`[diary] Could not load sketch ${sketch}:`, error);
        setLoaded({ kind: 'error' });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [active, sketch]);

  return loaded;
}

function CoffeeRing() {
  return (
    <svg className="diary-coffee-ring" viewBox="0 0 130 130" aria-hidden="true">
      <path d="M65 9C93 8 118 27 119 58c2 30-19 58-49 61C40 122 12 101 10 70 8 39 32 13 65 9Z" />
      <path d="M65 15c25 0 47 18 48 43 2 25-16 49-42 53-24 3-49-15-52-40-4-27 18-54 46-56Z" />
    </svg>
  );
}

function PaperCorners() {
  return (
    <>
      <span className="diary-paper-corner diary-corner-texture-one" aria-hidden="true" />
      <span className="diary-paper-corner diary-corner-texture-two" aria-hidden="true" />
      <span className="diary-paper-corner diary-corner-texture-three" aria-hidden="true" />
      <span className="diary-paper-corner diary-corner-texture-four" aria-hidden="true" />
    </>
  );
}

function Sketch({ project, active }: { project: PortfolioProject; active: boolean }) {
  const sketch = useSketch(project.sketch, active);
  return (
    <div className="diary-sketch-frame">
      <div className="diary-tape diary-tape-one" aria-hidden="true" />
      <div className="diary-tape diary-tape-two" aria-hidden="true" />
      {sketch?.kind === 'svg' && (
        <svg className="diary-sketch-svg" viewBox={sketch.viewBox} role="img" aria-label={`${project.title} pencil sketch`}>
          {sketch.paths.map((d, index) => (
            <path className="sketch-stroke" d={d} key={`${index}-${d.slice(0, 14)}`} />
          ))}
        </svg>
      )}
      {sketch?.kind === 'raster' && <img className="diary-sketch-raster" src={sketch.url} alt={`${project.title} sketch`} />}
      {(sketch === null || sketch.kind === 'error') && (
        <svg className="diary-sketch-svg diary-sketch-fallback" viewBox="0 0 640 460" aria-hidden="true">
          <path d="M90 320c80-110 140-100 210-150s115-40 180 10 95 40 130 0M125 350c75-75 128-78 193-120s107-20 155 13 86 27 126-3M180 390h290m-260 18h205" />
        </svg>
      )}
    </div>
  );
}

function ProjectWriting({ project, index, reducedMotion }: { project: PortfolioProject; index: number; reducedMotion: boolean }) {
  return (
    <div className="diary-writing">
      <div className="diary-project-label">FIELD NOTE · 0{index + 1}</div>
      <h2 className="diary-hand-title">{project.title}</h2>
      <p className="diary-year">{project.year} <span>— {project.status}</span></p>
      <p className="diary-description">{project.description}</p>
      <h3 className="diary-tools-heading">IN THE TOOLBOX</h3>
      <ul className="diary-tools">
        {project.tools.map((tool, toolIndex) => (
          <li key={tool}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path pathLength={1} className={reducedMotion ? 'check-drawn' : ''} style={{ '--check-delay': `${toolIndex * 90}ms` } as CSSProperties} d="m4 12 5 5L20 6" />
            </svg>
            {tool}
          </li>
        ))}
      </ul>
      <a className="diary-repo-link" href={project.repo} target="_blank" rel="noreferrer">
        OPEN REPOSITORY ↗
      </a>
    </div>
  );
}

export default function Diary({ reducedMotion, onBack }: DiaryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const turnTimer = useRef<number | null>(null);
  const [spread, setSpread] = useState(0);
  const [turning, setTurning] = useState(false);
  const [paperFallback, setPaperFallback] = useState(false);
  const currentProjectIndex = spread - 1;
  const project = projects[currentProjectIndex];

  useEffect(() => {
    rootRef.current?.querySelector<HTMLButtonElement>('.diary-close')?.focus();
    return () => {
      if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const textures = [
      '/assets/textures/paper-stained.jpg',
      '/assets/textures/paper-clean.jpg',
    ];
    void Promise.all(textures.map((source) => new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => {
        console.warn(`[diary] Texture failed to load: ${source}`);
        resolve(false);
      };
      image.src = source;
    }))).then((loaded) => {
      if (!cancelled) setPaperFallback(loaded.some((result) => !result));
    });
    return () => { cancelled = true; };
  }, []);

  const turnTo = useCallback((next: number) => {
    const destination = Math.max(0, Math.min(5, next));
    if (destination === spread || turning) return;
    if (reducedMotion) {
      setSpread(destination);
      emit('page:turn', { page: destination + 1 });
      return;
    }
    setTurning(true);
    turnTimer.current = window.setTimeout(() => {
      setSpread(destination);
      setTurning(false);
      emit('page:turn', { page: destination + 1 });
    }, 700);
  }, [reducedMotion, spread, turning]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onBack();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      turnTo(spread + 1);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      turnTo(spread - 1);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = rootRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href]',
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

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!swipeStart.current) return;
    const dx = event.clientX - swipeStart.current.x;
    const dy = event.clientY - swipeStart.current.y;
    swipeStart.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    turnTo(spread + (dx < 0 ? 1 : -1));
  };

  const contentsJump = (event: MouseEvent<HTMLButtonElement>, destination: number) => {
    event.stopPropagation();
    turnTo(destination);
  };

  return (
    <div
      ref={rootRef}
      className={`diary-overlay${reducedMotion ? ' is-reduced-motion' : ''}${paperFallback ? ' has-paper-fallback' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diary-heading"
      onKeyDown={onKeyDown}
    >
      <button className="diary-close" type="button" onClick={onBack} aria-label="Close journal and return to desk">×</button>
      <div className="diary-book-wrap">
        <div className="diary-book-base" aria-hidden="true" />
        <div
          className={`diary-spread${turning ? ' is-turning' : ''}${spread === 5 ? ' is-closing-spread' : ''}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
        >
          <section className="diary-page diary-page-left">
            <PaperCorners />
            {spread === 0 ? (
              <>
                <p className="diary-small-label">A POCKET INDEX</p>
                <h1 id="diary-heading" className="diary-hand-title diary-contents-title">Contents</h1>
                <ol className="diary-contents-list">
                  {projects.map((item, index) => (
                    <li key={item.title}>
                      <button type="button" onClick={(event) => contentsJump(event, index + 1)}>
                        <span>{item.title}</span><small>{item.year}</small>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : spread === 5 ? (
              <div className="diary-closing-note">
                <p className="diary-small-label">UNTIL THE NEXT ENTRY</p>
                <h1 id="diary-heading" className="diary-hand-title">More coming.</h1>
                <p className="diary-closing-hand">Check the repos.</p>
                <a className="diary-repo-link" href={repoUrl} target="_blank" rel="noreferrer">ROHITPDL ON GITHUB ↗</a>
              </div>
            ) : project ? (
              <>
                <h1 id="diary-heading" className="sr-only">{project.title}</h1>
                <ProjectWriting project={project} index={currentProjectIndex} reducedMotion={reducedMotion} />
              </>
            ) : null}
            <button className="diary-corner diary-corner-left" type="button" onClick={() => turnTo(spread - 1)} aria-label="Previous spread" disabled={spread === 0} />
          </section>
          <section className="diary-page diary-page-right">
            <PaperCorners />
            {spread === 0 ? (
              <div className="diary-opening-note">
                <p className="diary-small-label">NOTES FROM THE WORKBENCH</p>
                <p className="diary-hand-copy">A few works in progress, held here between the first sketch and the next idea.</p>
                <CoffeeRing />
                <span className="diary-margin-doodle" aria-hidden="true">⌁ ✳ ⌁</span>
              </div>
            ) : spread === 5 ? (
              <div className="diary-closing-art" aria-hidden="true">✳</div>
            ) : project ? (
              <div className="diary-sketch-page">
                <Sketch project={project} active={Boolean(project)} />
                <p className="diary-sketch-caption">A pencil note for {project.title.toLowerCase()}.</p>
                <span className="diary-margin-doodle" aria-hidden="true">⌁</span>
              </div>
            ) : null}
            <button className="diary-corner diary-corner-right" type="button" onClick={() => turnTo(spread + 1)} aria-label="Next spread" disabled={spread === 5} />
          </section>
          {turning && <div className={`diary-turn-leaf ${spread < 5 ? 'turn-forward' : 'turn-back'}`} aria-hidden="true"><div /><div /></div>}
        </div>
        <div className="diary-spine-shadow" aria-hidden="true" />
      </div>
      <div className="diary-navigation" aria-label="Journal navigation">
        <button type="button" onClick={() => turnTo(spread - 1)} disabled={spread === 0} aria-label="Previous spread">←</button>
        <span>{spread + 1} / 6</span>
        <button type="button" onClick={() => turnTo(spread + 1)} disabled={spread === 5} aria-label="Next spread">→</button>
      </div>
      <div className="sr-only" aria-live="polite">Spread {spread + 1} of 6</div>
      <section className="sr-only" aria-label="Text version of all project journal entries">
        {projects.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.year}. {item.description}</p>
            <p>Tools: {item.tools.join(', ')}. Status: {item.status}.</p>
            <p>Repository: {item.repo}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
