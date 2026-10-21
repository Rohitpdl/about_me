import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Volume2, VolumeX, Menu as MenuIcon, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { hasLayeredFocalPair, sceneById, sceneRegistry, type SceneId } from './scenes/registry';
import { portfolioContent } from './data/content';
import { closeJournal, useWorldStore } from './scenes/store';
import DebugControls from './scenes/DebugControls';
import Desk from './components/Desk';

const WorldCanvas = lazy(() => import('./scenes/WorldCanvas'));
type SceneCommand = (id: SceneId) => void;
let transitionHandler: SceneCommand | null = null;
/** The shared jump API for menu, compass, keyboard and the scene's scroll affordance. */
export function transitionTo(sceneId: SceneId) { transitionHandler?.(sceneId); }
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isJourneyScene = (id: SceneId) => id === 'hero' || id === 'about';

function SceneCopy({ id }: { id: SceneId }) {
  if (id === 'hero') return (
    <>
      <div className="eyebrow" data-scene-line>A portfolio / a world in progress</div>
      <h1 className="hero-title" data-testid="text-portfolio-name"><span data-scene-line>Rohit</span><span className="name-second" data-scene-line>Paudel</span></h1>
      <div className="role-line" data-scene-line>{portfolioContent.roles.map((role, i) => <span key={role} style={{ display: 'contents' }}>{i > 0 && <i aria-hidden="true">/</i>}{role}</span>)}</div>
      <p className="hero-copy" data-testid="text-hero-intro" data-scene-line>{portfolioContent.heroLine}</p>
    </>
  );
  if (id === 'about') return (
    <>
      <div className="eyebrow" data-scene-line>A little about the person behind the pixels</div>
      <div className="about-layout">
        <div><h1 className="about-title" data-scene-line>The wayfinder</h1><p className="about-bio" data-testid="text-about-bio" data-scene-line>{portfolioContent.bio}</p></div>
        <div className="age-mark" data-scene-line><strong>{portfolioContent.age}</strong> years exploring<br />curiosity is the compass</div>
      </div>
    </>
  );
  if (id === 'projects') return (
    <section className="projects-hud" aria-label="Projects scene">
      <h1 data-scene-line>THE LOG</h1>
      <p data-scene-line>Every project is an entry.</p>
      <span className="projects-field-notes" data-scene-line>FIELD NOTES</span>
    </section>
  );
  if (id === 'skills') return (
    <>
      <div className="eyebrow" data-scene-line>The things I build with</div>
      <section className="not-built" aria-label="Skills"><h1 data-scene-line>The toolkit</h1><div className="skill-cloud">{portfolioContent.skills.map((skill) => <span className="skill-tag" key={skill.name}>{skill.name}<small>{skill.level}</small></span>)}</div></section>
    </>
  );
  if (id === 'experience') return (
    <>
      <div className="eyebrow" data-scene-line>Somewhere between learning and doing</div>
      <section className="not-built" aria-label="Experience"><h1 data-scene-line>The path behind</h1><div className="preview-list">{portfolioContent.experience.map((item) => <article className="preview-row" key={item.place}><span className="preview-index">↗</span><div><h2>{item.role}</h2><p>{item.place} <span>— {item.dates}</span></p></div></article>)}</div></section>
    </>
  );
  return (
    <>
      <div className="eyebrow" data-scene-line>A signal in the dark</div>
      <section className="not-built contact-panel" aria-label="Contact Rohit"><h1 data-scene-line>Let’s make<br />something.</h1><a className="contact-email" href={`mailto:${portfolioContent.links.email}`} data-testid="link-email" data-scene-line>{portfolioContent.links.email}</a><div className="social-links" data-scene-line><a href={portfolioContent.links.linkedin} target="_blank" rel="noreferrer" data-testid="link-linkedin">LinkedIn</a><a href={portfolioContent.links.instagram} target="_blank" rel="noreferrer" data-testid="link-instagram">Instagram</a><a href={portfolioContent.links.github} target="_blank" rel="noreferrer" data-testid="link-github">GitHub</a></div></section>
    </>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceUiMotion = useReducedMotion();
  const activeId = useWorldStore((state) => state.currentScene);
  const transitioning = useWorldStore((state) => state.transitioning);
  const progress = useWorldStore((state) => state.progress);
  const sceneTuning = useWorldStore((state) => state.sceneTuning);
  const muted = useWorldStore((state) => state.muted);
  const overlay = useWorldStore((state) => state.overlay);
  const setMuted = useWorldStore((state) => state.setMuted);
  const lenisRef = useRef<Lenis | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrubEnabled = useRef(true);
  const crossfadeValue = useRef({ value: 0 });
  const crossfadeTween = useRef<gsap.core.Tween | null>(null);
  const inputCooldownUntil = useRef(0);
  const menuOpenRef = useRef(menuOpen);
  const [journalEntering, setJournalEntering] = useState(false);
  const [journalReturning, setJournalReturning] = useState(false);
  menuOpenRef.current = menuOpen;
  const currentIndex = sceneRegistry.findIndex((scene) => scene.id === activeId);
  const currentScene = sceneById(activeId);
  const query = new URLSearchParams(window.location.search);
  const debugScene = query.get('scene');
  const debugOverlay = query.get('overlay');
  const debugRoute = debugScene === 'projects' &&
    (debugOverlay === 'desk' || debugOverlay === 'diary');
  const isDebug = query.has('debug') || debugRoute;
  const initialSpread = Math.max(1, Math.min(6, Number.parseInt(query.get('spread') ?? '1', 10) || 1));
  const reduceMotion = Boolean(reduceUiMotion);
  const transitionFrom = useWorldStore((state) => state.transitionFrom);

  useEffect(() => {
    if (!debugRoute || (debugOverlay !== 'desk' && debugOverlay !== 'diary')) return;
    const store = useWorldStore.getState();
    store.setCurrentScene('projects');
    store.setTransitionFrom(null);
    store.setTransition(false, 0);
    store.setOverlay(debugOverlay);
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = reducedMotion();
    const wheelBurst = { distance: 0, lastAt: 0 };
    let touchStart: { x: number; y: number; scene: SceneId; progress: number; interactive: boolean } | null = null;
    let lastScrubPosition = 0;
    const lenis = new Lenis({
      duration: reduce ? .1 : 1.1,
      smoothWheel: !reduce,
      syncTouch: !reduce,
      touchMultiplier: .9,
      wheelMultiplier: .72,
    });
    lenisRef.current = lenis;
    const updateLenis = (time: number) => lenis.raf(time * 1000);
    const updateScrollTrigger = () => ScrollTrigger.update();
    lenis.on('scroll', updateScrollTrigger);
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const runway = document.getElementById('scrub-runway');
    if (runway) {
      triggerRef.current = ScrollTrigger.create({
        trigger: runway,
        start: 'top top',
        end: 'bottom bottom',
        scrub: reduce ? false : .36,
        onUpdate(self) {
          if (!scrubEnabled.current) return;
          const position = Math.max(0, Math.min(1, self.progress));
          if ((position <= .002 && lastScrubPosition > .002) || (position >= .998 && lastScrubPosition < .998)) {
            inputCooldownUntil.current = Date.now() + 500;
          }
          lastScrubPosition = position;
          const store = useWorldStore.getState();
          const inTravel = position > .002 && position < .998;
          const scene: SceneId = position >= .5 ? 'about' : 'hero';
          if (store.currentScene !== scene) store.setCurrentScene(scene);
          const from = inTravel ? 'hero' : null;
          if (store.transitionFrom !== from) store.setTransitionFrom(from);
          store.setTransition(inTravel, position);
        },
      });
      triggerRef.current.update();
    }

    const nextScene = (scene: SceneId, direction: -1 | 1) => {
      const index = sceneRegistry.findIndex((entry) => entry.id === scene);
      return sceneRegistry[index + direction]?.id;
    };

    const snapTo = (id: SceneId) => {
      const done = useWorldStore.getState();
      done.setCurrentScene(id);
      done.setTransitionFrom(null);
      done.setTransition(false, id === 'about' ? 1 : 0);
      if (isJourneyScene(id)) {
        scrubEnabled.current = true;
        const endpoint = id === 'about' ? Math.max(0, triggerRef.current?.end ?? window.innerHeight * 1.2) : 0;
        lenis.scrollTo(endpoint, { immediate: true });
      } else {
        scrubEnabled.current = false;
      }
      inputCooldownUntil.current = Date.now() + 500;
    };

    const jump = (target: SceneId) => {
      let store = useWorldStore.getState();
      let source = store.currentScene;
      const scrubTravel = store.transitioning && store.transitionFrom === 'hero' && isJourneyScene(source);
      if (Date.now() < inputCooldownUntil.current) return;
      if (store.transitioning && !scrubTravel) return;
      if (scrubTravel && !isJourneyScene(target)) {
        if (source !== 'about') return;
        scrubEnabled.current = false;
        store.setCurrentScene('about');
        store.setTransitionFrom(null);
        store.setTransition(false, 1);
        lenis.scrollTo(Math.max(0, triggerRef.current?.end ?? window.innerHeight * 1.2), { immediate: true });
        store = useWorldStore.getState();
        source = store.currentScene;
      }
      setMenuOpen(false);

      if (isJourneyScene(source) && isJourneyScene(target) && scrubEnabled.current) {
        if (source === target && (target === 'about' ? store.progress >= .998 : store.progress <= .002)) return;
        store.setTransitionFrom('hero');
        const end = Math.max(0, triggerRef.current?.end ?? window.innerHeight * 1.2);
        lenis.scrollTo(target === 'about' ? end : 0, {
          duration: reduce ? .18 : store.sceneTuning[source].transitionDuration,
          immediate: reduce,
        });
        return;
      }
      if (source === target && store.transitionFrom === null) return;

      scrubEnabled.current = false;
      crossfadeTween.current?.kill();
      store.setTransitionFrom(source);
      store.setCurrentScene(target);
      store.setTransition(true, 0);
      crossfadeValue.current.value = 0;
      const duration = reduce ? .32 : store.sceneTuning[source].transitionDuration || 1.6;
      const settle = (scene: SceneId) => snapTo(scene);
      crossfadeTween.current = gsap.to(crossfadeValue.current, {
        value: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => useWorldStore.getState().setTransition(true, crossfadeValue.current.value),
        onComplete: () => settle(target),
        onInterrupt: () => settle(crossfadeValue.current.value >= .5 ? target : source),
      });
    };
    transitionHandler = jump;

    const onKeyDown = (event: KeyboardEvent) => {
      if (useWorldStore.getState().overlay !== 'none') return;
      if (event.key === 'Escape') setMenuOpen(false);
      if (menuOpenRef.current) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
      const forward = event.key === 'ArrowDown' || event.key === 'PageDown' || (event.code === 'Space' && !event.shiftKey);
      const backward = event.key === 'ArrowUp' || event.key === 'PageUp' || (event.code === 'Space' && event.shiftKey);
      if (!forward && !backward) return;
      event.preventDefault();
      if (event.repeat || Date.now() < inputCooldownUntil.current) return;
      const state = useWorldStore.getState();
      if (state.transitioning) return;
      const destination = nextScene(state.currentScene, forward ? 1 : -1);
      if (destination) jump(destination);
    };

    const consumeWheelGesture = (direction: -1 | 1, distance: number, now: number) => {
      if (now - wheelBurst.lastAt > 180) wheelBurst.distance = 0;
      wheelBurst.lastAt = now;
      wheelBurst.distance += Math.min(Math.abs(distance), 120);
      if (wheelBurst.distance < 30) return;
      wheelBurst.distance = 0;
      const destination = nextScene(useWorldStore.getState().currentScene, direction);
      if (destination) jump(destination);
    };

    const onWheel = (event: WheelEvent) => {
      if (useWorldStore.getState().overlay !== 'none') return;
      if (menuOpenRef.current || event.ctrlKey) return;
      const state = useWorldStore.getState();
      const now = Date.now();
      const direction: -1 | 1 = event.deltaY >= 0 ? 1 : -1;
      const distance = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * window.innerHeight
          : event.deltaY;
      const scrubTravel = state.transitioning && state.transitionFrom === 'hero' && isJourneyScene(state.currentScene);
      const inJourney = isJourneyScene(state.currentScene);

      if (now < inputCooldownUntil.current) {
        event.preventDefault();
        wheelBurst.distance = 0;
        return;
      }
      if (state.transitioning && !scrubTravel) {
        event.preventDefault();
        wheelBurst.distance = 0;
        return;
      }
      if (inJourney) {
        const leavingAbout = state.currentScene === 'about' && direction > 0 && state.progress >= .985;
        if (leavingAbout) {
          event.preventDefault();
          consumeWheelGesture(direction, distance, now);
        } else if (state.currentScene === 'hero' && direction < 0 && state.progress <= .015) {
          event.preventDefault();
        }
        return;
      }

      event.preventDefault();
      consumeWheelGesture(direction, distance, now);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (useWorldStore.getState().overlay !== 'none') return;
      const target = event.target instanceof Element ? event.target : null;
      const state = useWorldStore.getState();
      touchStart = {
        x: event.changedTouches[0]?.clientX ?? 0,
        y: event.changedTouches[0]?.clientY ?? 0,
        scene: state.currentScene,
        progress: state.progress,
        interactive: Boolean(target?.closest('button, a, input, textarea, select, [contenteditable="true"]')),
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (useWorldStore.getState().overlay !== 'none') return;
      if (!touchStart || touchStart.interactive || menuOpenRef.current) return;
      const state = useWorldStore.getState();
      const scrubTravel = state.transitioning && state.transitionFrom === 'hero' && isJourneyScene(state.currentScene);
      if (state.transitioning && !scrubTravel) {
        event.preventDefault();
        return;
      }
      if (Date.now() < inputCooldownUntil.current) {
        event.preventDefault();
        return;
      }
      const currentY = event.changedTouches[0]?.clientY ?? touchStart.y;
      const direction: -1 | 1 = touchStart.y > currentY ? 1 : -1;
      const atAboutEdge = state.currentScene === 'about' && direction > 0 && state.progress >= .985;
      const atHeroEdge = state.currentScene === 'hero' && direction < 0 && state.progress <= .015;
      if (!isJourneyScene(state.currentScene) || atAboutEdge || atHeroEdge) event.preventDefault();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (useWorldStore.getState().overlay !== 'none') return;
      if (!touchStart) return;
      const start = touchStart;
      touchStart = null;
      if (start.interactive || menuOpenRef.current || Date.now() < inputCooldownUntil.current) return;
      const endY = event.changedTouches[0]?.clientY ?? start.y;
      const movement = start.y - endY;
      if (Math.abs(movement) < 36) return;
      const direction: -1 | 1 = movement > 0 ? 1 : -1;
      const state = useWorldStore.getState();
      const scrubTravel = state.transitioning && state.transitionFrom === 'hero' && isJourneyScene(state.currentScene);
      if (state.transitioning && !scrubTravel) return;
      const atAboutEdge = state.currentScene === 'about' && direction > 0 && state.progress >= .985;
      if (start.scene === 'about' && direction > 0 && start.progress >= .96 && atAboutEdge) {
        const destination = nextScene('about', 1);
        if (destination) jump(destination);
        return;
      }
      if (isJourneyScene(start.scene)) return;
      const destination = nextScene(state.currentScene, direction);
      if (destination) jump(destination);
    };

    const onTouchCancel = () => {
      if (useWorldStore.getState().overlay !== 'none') return;
      touchStart = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      transitionHandler = null;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      crossfadeTween.current?.kill();
      triggerRef.current?.kill();
      gsap.ticker.remove(updateLenis);
      lenis.off('scroll', updateScrollTrigger);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (menuOpen || overlay !== 'none') lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, [menuOpen, overlay]);

  useEffect(() => {
    document.body.classList.toggle('journal-open', overlay !== 'none');
    if (overlay !== 'desk') {
      setJournalEntering(false);
      return () => document.body.classList.remove('journal-open');
    }
    setJournalEntering(true);
    const timer = window.setTimeout(() => setJournalEntering(false), 1400);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove('journal-open');
    };
  }, [overlay]);

  useEffect(() => {
    if (overlay !== 'none' && menuOpen) setMenuOpen(false);
  }, [menuOpen, overlay]);

  useEffect(() => {
    if (!journalReturning) return;
    const timer = window.setTimeout(() => setJournalReturning(false), 500);
    return () => window.clearTimeout(timer);
  }, [journalReturning]);

  const journalPushed = overlay !== 'none' && !reduceMotion && !journalReturning;

  return (
    <>
      <main className="portfolio" aria-label="Rohit Paudel portfolio" style={{ '--fog-density': sceneTuning[activeId].fogDensity, '--transition-progress': progress } as CSSProperties}>
        <div className={`scene-world ${transitioning ? 'travelling' : 'settled'}${journalEntering ? ' journal-entering' : ''}${journalPushed ? ' journal-overlay-active' : ''}${journalReturning ? ' journal-returning' : ''}`} data-scene={activeId} style={{ '--transition-push': journalPushed ? .055 : transitioning && !reduceMotion && transitionFrom && !((transitionFrom === 'hero' && isJourneyScene(activeId)) || hasLayeredFocalPair(transitionFrom, activeId)) ? .018 * Math.sin(progress * Math.PI) : 0 } as CSSProperties}>
          <Suspense fallback={<div className="webgl-fallback" aria-hidden="true" />}><WorldCanvas /></Suspense>
          <div className="scene-wash" aria-hidden="true" />
          <div className="vignette" aria-hidden="true" />
        </div>
        <div className={`chromatic ${transitioning && !reduceMotion ? 'pulsing' : ''}`} aria-hidden="true" />
        <div className="letterbox top" aria-hidden="true" /><div className="letterbox bottom" aria-hidden="true" />
        <div className="intro-wash" aria-hidden="true" style={{ opacity: transitioning && !reduceMotion ? Math.max(0, 1 - Math.abs(progress - .54) * 8) * .84 : 0 }} />
        <div className="world-ui">
          <header className="topline">
            <div className="wordmark" aria-label="Rohit Paudel portfolio">R.P. <span>— Field archive / 01</span></div>
            <div className="top-actions">
              <button className="skip-button" onClick={() => transitionTo('about')} disabled={transitioning || overlay !== 'none'} data-testid="button-skip-intro">Skip intro</button>
              <button className="icon-button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute ambient audio' : 'Mute ambient audio'} aria-pressed={!muted} data-testid="button-mute">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
              <button className="icon-button" onClick={() => setMenuOpen(true)} disabled={transitioning || overlay !== 'none'} aria-label="Open section menu" aria-expanded={menuOpen} data-testid="button-open-menu"><MenuIcon size={16} /></button>
            </div>
          </header>
          <motion.section className={`scene-content ${activeId === 'projects' ? 'projects-copy' : ''} ${!transitioning || progress >= .56 ? 'is-revealed' : ''}`} key={activeId} initial={{ opacity: 0 }} animate={{ opacity: transitioning && progress < .56 ? 0 : 1 }} transition={{ duration: reduceUiMotion ? 0 : .45, ease: 'easeOut' }} aria-live="polite">
            <SceneCopy id={activeId} />
          </motion.section>
          {activeId === 'hero' && <button className="scroll-hint" onClick={() => transitionTo('about')} aria-label="Scroll to enter the portfolio" data-testid="button-scroll-enter">SCROLL TO ENTER</button>}
          <nav className="compass" aria-label="Portfolio sections">
            {sceneRegistry.map((scene) => <button key={scene.id} className={`compass-pip ${activeId === scene.id ? 'active' : ''}`} disabled={transitioning || overlay !== 'none'} onClick={() => transitionTo(scene.id)} aria-label={`Go to ${scene.title}`} aria-current={activeId === scene.id ? 'step' : undefined} data-testid={`button-section-${scene.id}`} />)}
          </nav>
          {activeId !== 'projects' && <div className="section-readout" aria-live="polite" data-testid="text-active-section">{currentScene.label}</div>}
          <div className="scene-count" aria-label={`Scene ${currentIndex + 1} of ${sceneRegistry.length}`}>0{currentIndex + 1} <span>/ 0{sceneRegistry.length}</span></div>
        </div>
        {(overlay === 'desk' || overlay === 'diary') && <Desk overlay={overlay} reducedMotion={reduceMotion} initialSpread={initialSpread} onCloseStart={() => setJournalReturning(true)} onClose={closeJournal} />}
        <AnimatePresence>
        {menuOpen && <motion.div className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceUiMotion ? 0 : .22 }}>
          <motion.div className="menu-inner" initial={{ x: reduceUiMotion ? 0 : 30 }} animate={{ x: 0 }} exit={{ x: reduceUiMotion ? 0 : 24 }} transition={{ duration: reduceUiMotion ? 0 : .3, ease: 'easeOut' }}>
            <button className="icon-button menu-close" aria-label="Close section menu" onClick={() => setMenuOpen(false)} data-testid="button-close-menu"><X size={16} /></button>
            <p className="menu-heading" id="menu-title">Choose a trail</p>
            <ol className="menu-list">{sceneRegistry.map((scene, index) => <li key={scene.id}><button disabled={transitioning} onClick={() => transitionTo(scene.id)} aria-current={activeId === scene.id ? 'true' : undefined} data-testid={`menu-section-${scene.id}`}><small>0{index + 1}</small><span>{scene.title}</span></button></li>)}</ol>
            <p className="menu-note">Six scenes in a city reclaimed by the night.<br />Use the arrow keys to travel between them.</p>
          </motion.div>
        </motion.div>}
        </AnimatePresence>
        {isDebug && <DebugControls />}
        <div className="sr-only" aria-live="polite">{muted ? 'Ambient audio off' : 'Ambient audio on'}</div>
        <div className="grain" aria-hidden="true" />
      </main>
      <div id="scrub-runway" className="scroll-runway" aria-hidden="true" />
    </>
  );
}
