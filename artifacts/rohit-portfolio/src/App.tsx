import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Volume2, VolumeX, Menu as MenuIcon, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { sceneById, sceneRegistry, type SceneId } from './scenes/registry';
import { portfolioContent } from './data/content';
import { useWorldStore } from './scenes/store';
import DebugControls from './scenes/DebugControls';

const WorldCanvas = lazy(() => import('./scenes/WorldCanvas'));
type SceneCommand = (id: SceneId) => void;
let transitionHandler: SceneCommand | null = null;
/** The shared jump API for menu, compass, keyboard and the scene's scroll affordance. */
export function transitionTo(sceneId: SceneId) { transitionHandler?.(sceneId); }
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function SceneCopy({ id }: { id: SceneId }) {
  if (id === 'hero') return (
    <>
      <div className="eyebrow">A portfolio / a world in progress</div>
      <h1 className="hero-title" data-testid="text-portfolio-name"><span>Rohit</span><span className="name-second">Paudel</span></h1>
      <div className="role-line">{portfolioContent.roles.map((role, i) => <span key={role} style={{ display: 'contents' }}>{i > 0 && <i aria-hidden="true">/</i>}{role}</span>)}</div>
      <p className="hero-copy" data-testid="text-hero-intro">{portfolioContent.heroLine}</p>
    </>
  );
  if (id === 'about') return (
    <>
      <div className="eyebrow">A little about the person behind the pixels</div>
      <div className="about-layout">
        <div><h1 className="about-title">The wayfinder</h1><p className="about-bio" data-testid="text-about-bio">{portfolioContent.bio}</p></div>
        <div className="age-mark"><strong>{portfolioContent.age}</strong> years exploring<br />curiosity is the compass</div>
      </div>
    </>
  );
  if (id === 'projects') return (
    <>
      <div className="eyebrow">Four signals recovered from the ruins</div>
      <section className="not-built" aria-label="Selected projects"><h1>Field notes</h1><div className="preview-list">{portfolioContent.projects.map((project, i) => <article className="preview-row" key={project.title}><span className="preview-index">0{i + 1}</span><div><h2>{project.title}</h2><p>{project.tools} <span>— {project.status}</span></p></div></article>)}</div></section>
    </>
  );
  if (id === 'skills') return (
    <>
      <div className="eyebrow">The things I build with</div>
      <section className="not-built" aria-label="Skills"><h1>The toolkit</h1><div className="skill-cloud">{portfolioContent.skills.map((skill) => <span className="skill-tag" key={skill.name}>{skill.name}<small>{skill.level}</small></span>)}</div></section>
    </>
  );
  if (id === 'experience') return (
    <>
      <div className="eyebrow">Somewhere between learning and doing</div>
      <section className="not-built" aria-label="Experience"><h1>The path behind</h1><div className="preview-list">{portfolioContent.experience.map((item) => <article className="preview-row" key={item.place}><span className="preview-index">↗</span><div><h2>{item.role}</h2><p>{item.place} <span>— {item.dates}</span></p></div></article>)}</div></section>
    </>
  );
  return (
    <>
      <div className="eyebrow">A signal in the dark</div>
      <section className="not-built contact-panel" aria-label="Contact Rohit"><h1>Let’s make<br />something.</h1><a className="contact-email" href={`mailto:${portfolioContent.links.email}`} data-testid="link-email">{portfolioContent.links.email}</a><div className="social-links"><a href={portfolioContent.links.linkedin} target="_blank" rel="noreferrer" data-testid="link-linkedin">LinkedIn</a><a href={portfolioContent.links.instagram} target="_blank" rel="noreferrer" data-testid="link-instagram">Instagram</a><a href={portfolioContent.links.github} target="_blank" rel="noreferrer" data-testid="link-github">GitHub</a></div></section>
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
  const setMuted = useWorldStore((state) => state.setMuted);
  const lenisRef = useRef<Lenis | null>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrubEnabled = useRef(true);
  const crossfadeValue = useRef({ value: 0 });
  const crossfadeTween = useRef<gsap.core.Tween | null>(null);
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  const currentIndex = sceneRegistry.findIndex((scene) => scene.id === activeId);
  const currentScene = sceneById(activeId);
  const isDebug = new URLSearchParams(window.location.search).has('debug');

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduce = reducedMotion();
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      syncTouch: true,
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

    const jump = (target: SceneId) => {
      setMenuOpen(false);
      const store = useWorldStore.getState();
      const source = store.currentScene;
      const sourceIsJourney = source === 'hero' || source === 'about';
      const targetIsJourney = target === 'hero' || target === 'about';
      const duration = reduce ? .24 : store.sceneTuning[source].transitionDuration;
      crossfadeTween.current?.kill();

      if (sourceIsJourney && targetIsJourney && scrubEnabled.current) {
        if (source === target && (target === 'about' ? store.progress >= .998 : store.progress <= .002)) return;
        store.setTransitionFrom('hero');
        const end = Math.max(0, triggerRef.current?.end ?? window.innerHeight * 1.2);
        lenis.scrollTo(target === 'about' ? end : 0, {
          duration: reduce ? .18 : duration,
          immediate: reduce,
        });
        return;
      }
      if (source === target && store.transitionFrom === null) return;

      scrubEnabled.current = false;
      store.setTransitionFrom(source);
      store.setCurrentScene(target);
      store.setTransition(true, 0);
      crossfadeValue.current.value = 0;
      crossfadeTween.current = gsap.to(crossfadeValue.current, {
        value: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => useWorldStore.getState().setTransition(true, crossfadeValue.current.value),
        onComplete: () => {
          const done = useWorldStore.getState();
          done.setTransitionFrom(null);
          done.setTransition(false, target === 'about' ? 1 : 0);
          if (target === 'hero' || target === 'about') {
            scrubEnabled.current = true;
            const endpoint = target === 'about' ? Math.max(0, triggerRef.current?.end ?? window.innerHeight * 1.2) : 0;
            lenis.scrollTo(endpoint, { immediate: true });
          }
        },
      });
    };
    transitionHandler = jump;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (menuOpenRef.current) return;
      if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        transitionTo(sceneRegistry[Math.min(sceneRegistry.length - 1, sceneRegistry.findIndex((scene) => scene.id === useWorldStore.getState().currentScene) + 1)].id);
      } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        transitionTo(sceneRegistry[Math.max(0, sceneRegistry.findIndex((scene) => scene.id === useWorldStore.getState().currentScene) - 1)].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      transitionHandler = null;
      window.removeEventListener('keydown', onKeyDown);
      crossfadeTween.current?.kill();
      triggerRef.current?.kill();
      gsap.ticker.remove(updateLenis);
      lenis.off('scroll', updateScrollTrigger);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (menuOpen) lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, [menuOpen]);

  return (
    <>
      <main className="portfolio" aria-label="Rohit Paudel portfolio" style={{ '--fog-density': sceneTuning[activeId].fogDensity, '--transition-progress': progress } as CSSProperties}>
        <div className={`scene-world ${transitioning ? 'travelling' : 'settled'}`} data-scene={activeId}>
          <Suspense fallback={<div className="webgl-fallback" aria-hidden="true" />}><WorldCanvas /></Suspense>
          <div className="scene-wash" aria-hidden="true" />
          <div className="vignette" aria-hidden="true" />
        </div>
        <div className={`chromatic ${transitioning ? 'pulsing' : ''}`} aria-hidden="true" />
        <div className="letterbox top" aria-hidden="true" /><div className="letterbox bottom" aria-hidden="true" />
        <div className="intro-wash" aria-hidden="true" style={{ opacity: transitioning ? Math.max(0, 1 - Math.abs(progress - .54) * 8) * .84 : 0 }} />
        <div className="world-ui">
          <header className="topline">
            <div className="wordmark" aria-label="Rohit Paudel portfolio">R.P. <span>— Field archive / 01</span></div>
            <div className="top-actions">
              <button className="skip-button" onClick={() => transitionTo('about')} data-testid="button-skip-intro">Skip intro</button>
              <button className="icon-button" onClick={() => setMuted(!muted)} aria-label={muted ? 'Unmute ambient audio' : 'Mute ambient audio'} aria-pressed={!muted} data-testid="button-mute">{muted ? <VolumeX size={15} /> : <Volume2 size={15} />}</button>
              <button className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Open section menu" aria-expanded={menuOpen} data-testid="button-open-menu"><MenuIcon size={16} /></button>
            </div>
          </header>
          <motion.section className="scene-content" key={activeId} initial={{ opacity: 0 }} animate={{ opacity: transitioning ? 0 : 1 }} transition={{ duration: reduceUiMotion ? 0 : .55, ease: 'easeOut' }} aria-live="polite">
            <SceneCopy id={activeId} />
          </motion.section>
          {activeId === 'hero' && <button className="scroll-hint" onClick={() => transitionTo('about')} aria-label="Scroll to enter the portfolio" data-testid="button-scroll-enter">SCROLL TO ENTER</button>}
          <nav className="compass" aria-label="Portfolio sections">
            {sceneRegistry.map((scene) => <button key={scene.id} className={`compass-pip ${activeId === scene.id ? 'active' : ''}`} onClick={() => transitionTo(scene.id)} aria-label={`Go to ${scene.title}`} aria-current={activeId === scene.id ? 'step' : undefined} data-testid={`button-section-${scene.id}`} />)}
          </nav>
          <div className="section-readout" aria-live="polite" data-testid="text-active-section">{currentScene.label}</div>
          <div className="scene-count" aria-label={`Scene ${currentIndex + 1} of ${sceneRegistry.length}`}>0{currentIndex + 1} <span>/ 0{sceneRegistry.length}</span></div>
        </div>
        <AnimatePresence>
        {menuOpen && <motion.div className="menu-panel" role="dialog" aria-modal="true" aria-labelledby="menu-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceUiMotion ? 0 : .22 }}>
          <motion.div className="menu-inner" initial={{ x: reduceUiMotion ? 0 : 30 }} animate={{ x: 0 }} exit={{ x: reduceUiMotion ? 0 : 24 }} transition={{ duration: reduceUiMotion ? 0 : .3, ease: 'easeOut' }}>
            <button className="icon-button menu-close" aria-label="Close section menu" onClick={() => setMenuOpen(false)} data-testid="button-close-menu"><X size={16} /></button>
            <p className="menu-heading" id="menu-title">Choose a trail</p>
            <ol className="menu-list">{sceneRegistry.map((scene, index) => <li key={scene.id}><button onClick={() => transitionTo(scene.id)} aria-current={activeId === scene.id ? 'true' : undefined} data-testid={`menu-section-${scene.id}`}><small>0{index + 1}</small><span>{scene.title}</span></button></li>)}</ol>
            <p className="menu-note">Six scenes in a city reclaimed by the night.<br />Use the arrow keys to travel between them.</p>
          </motion.div>
        </motion.div>}
        </AnimatePresence>
        {isDebug && <DebugControls />}
        <div className="sr-only" aria-live="polite">{muted ? 'Ambient audio muted. Audio is a visual-only control in this phase.' : 'Ambient audio enabled. Audio playback is not implemented in this phase.'}</div>
        <div className="grain" aria-hidden="true" />
      </main>
      <div id="scrub-runway" className="scroll-runway" aria-hidden="true" />
    </>
  );
}
