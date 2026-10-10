import { useControls, Leva } from 'leva';
import { sceneRegistry } from './registry';
import { useWorldStore } from './store';

type NumberControl = { value: number; min: number; max: number; step: number; onChange: (value: number) => void };

export default function DebugControls() {
  const schema: Record<string, NumberControl> = {};
  for (const scene of sceneRegistry) {
    const tuning = useWorldStore.getState().sceneTuning[scene.id];
    schema[`${scene.id} / Parallax strength`] = {
      value: tuning.parallaxStrength, min: 0, max: .12, step: .001,
      onChange: (value) => useWorldStore.getState().updateSceneTuning(scene.id, { parallaxStrength: value }),
    };
    schema[`${scene.id} / Depth scale`] = {
      value: tuning.depthScale, min: 0, max: 3, step: .05,
      onChange: (value) => useWorldStore.getState().updateSceneTuning(scene.id, { depthScale: value }),
    };
    schema[`${scene.id} / Fog density`] = {
      value: tuning.fogDensity, min: 0, max: .08, step: .001,
      onChange: (value) => useWorldStore.getState().updateSceneTuning(scene.id, { fogDensity: value }),
    };
    schema[`${scene.id} / Transition duration`] = {
      value: tuning.transitionDuration, min: .3, max: 3, step: .05,
      onChange: (value) => useWorldStore.getState().updateSceneTuning(scene.id, { transitionDuration: value }),
    };
    schema[`${scene.id} / Focal x`] = {
      value: tuning.focalPoint.x, min: 0, max: 1, step: .01,
      onChange: (value) => useWorldStore.getState().updateFocalPoint(scene.id, { x: value }),
    };
    schema[`${scene.id} / Focal y`] = {
      value: tuning.focalPoint.y, min: 0, max: 1, step: .01,
      onChange: (value) => useWorldStore.getState().updateFocalPoint(scene.id, { y: value }),
    };
  }
  useControls('Scene tuning · all six scenes', schema);
  return <Leva collapsed />;
}
