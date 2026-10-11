import { create } from 'zustand';
import { sceneRegistry, type SceneId, type SceneTuning } from './registry';

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
  sceneTuning: Record<SceneId, SceneTuning>;
  setCurrentScene: (scene: SceneId) => void;
  setTransition: (transitioning: boolean, progress: number) => void;
  setTransitionFrom: (scene: SceneId | null) => void;
  setMuted: (muted: boolean) => void;
  updateSceneTuning: (scene: SceneId, patch: Partial<Omit<SceneTuning, 'focalPoint'>>) => void;
  updateFocalPoint: (scene: SceneId, point: Partial<SceneTuning['focalPoint']>) => void;
};

export const useWorldStore = create<WorldState>((set) => ({
  currentScene: 'hero',
  transitionFrom: null,
  transitioning: false,
  progress: 0,
  muted: true,
  sceneTuning: initialTuning,
  setCurrentScene: (currentScene) => set({ currentScene }),
  setTransition: (transitioning, progress) => set({ transitioning, progress }),
  setTransitionFrom: (transitionFrom) => set({ transitionFrom }),
  setMuted: (muted) => set({ muted }),
  updateSceneTuning: (scene, patch) => set((state) => ({
    sceneTuning: { ...state.sceneTuning, [scene]: { ...state.sceneTuning[scene], ...patch } },
  })),
  updateFocalPoint: (scene, point) => set((state) => {
    const previous = state.sceneTuning[scene].focalPoint;
    if ((point.x === undefined || point.x === previous.x) && (point.y === undefined || point.y === previous.y)) return state;
    return { sceneTuning: { ...state.sceneTuning, [scene]: { ...state.sceneTuning[scene], focalPoint: { ...previous, ...point } } } };
  }),
}));
