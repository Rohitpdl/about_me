import { create } from 'zustand';
import { sceneRegistry, type SceneId, type SceneTuning } from './registry';
import { emit } from '../lib/events';

const initialTuning = Object.fromEntries(sceneRegistry.map((scene) => [scene.id, {
  parallaxStrength: scene.parallaxStrength,
  depthScale: 1.25,
  fogDensity: scene.id === 'projects' ? .026 : .018,
  transitionDuration: 1.6,
  focalPoint: { ...scene.focalPoint },
}])) as Record<SceneId, SceneTuning>;

type WorldState = {
  currentScene: SceneId;
  transitionFrom: SceneId | null;
  transitioning: boolean;
  progress: number;
  muted: boolean;
  overlay: 'none' | 'desk' | 'diary';
  projectsExposure: number;
  projectsVignette: number;
  sceneTuning: Record<SceneId, SceneTuning>;
  setCurrentScene: (scene: SceneId) => void;
  setTransition: (transitioning: boolean, progress: number) => void;
  setTransitionFrom: (scene: SceneId | null) => void;
  setMuted: (muted: boolean) => void;
  setOverlay: (overlay: WorldState['overlay']) => void;
  setProjectsExposure: (exposure: number) => void;
  setProjectsVignette: (vignette: number) => void;
  updateSceneTuning: (scene: SceneId, patch: Partial<Omit<SceneTuning, 'focalPoint'>>) => void;
  updateFocalPoint: (scene: SceneId, point: Partial<SceneTuning['focalPoint']>) => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  currentScene: 'hero',
  transitionFrom: null,
  transitioning: false,
  progress: 0,
  muted: true,
  overlay: 'none',
  projectsExposure: 1.55,
  projectsVignette: 0.38,
  sceneTuning: initialTuning,
  setCurrentScene: (currentScene) => set({ currentScene }),
  setTransition: (transitioning, progress) => set({ transitioning, progress }),
  setTransitionFrom: (transitionFrom) => set({ transitionFrom }),
  setMuted: (muted) => set({ muted }),
  setOverlay: (overlay) => set({ overlay }),
  setProjectsExposure: (projectsExposure) => set({ projectsExposure }),
  setProjectsVignette: (projectsVignette) => set({ projectsVignette }),
  updateSceneTuning: (scene, patch) => set((state) => ({
    sceneTuning: { ...state.sceneTuning, [scene]: { ...state.sceneTuning[scene], ...patch } },
  })),
  updateFocalPoint: (scene, point) => set((state) => {
    const previous = state.sceneTuning[scene].focalPoint;
    if ((point.x === undefined || point.x === previous.x) && (point.y === undefined || point.y === previous.y)) return state;
    return { sceneTuning: { ...state.sceneTuning, [scene]: { ...state.sceneTuning[scene], focalPoint: { ...previous, ...point } } } };
  }),
}));

export const enterJournal = () => {
  const store = useWorldStore.getState();
  if (store.overlay !== 'none') return;
  store.setOverlay('desk');
  emit('journal:open');
};

export const closeJournal = () => {
  const store = useWorldStore.getState();
  if (store.overlay === 'none') return;
  store.setOverlay('none');
  emit('journal:close');
};
