import { button, useControls, Leva } from 'leva';
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
  const state = useWorldStore.getState();
  schema['projects / Exposure'] = {
    value: state.projectsExposure, min: 0.8, max: 1.8, step: 0.01,
    onChange: (value) => useWorldStore.getState().setProjectsExposure(value),
  };
  schema['projects / Vignette'] = {
    value: state.projectsVignette, min: 0.15, max: 1, step: 0.01,
    onChange: (value) => useWorldStore.getState().setProjectsVignette(value),
  };
  useControls('Scene tuning · all six scenes', schema);
  const visual = useWorldStore.getState().projectsVisual;
  const setVisual = useWorldStore.getState().updateProjectsVisual;
  useControls('Projects halo and neon', {
    'Door halo intensity': {
      value: visual.doorHaloIntensity, min: 0, max: 0.8, step: 0.01,
      onChange: (value: number) => setVisual({ doorHaloIntensity: value }),
    },
    'Door halo size': {
      value: visual.doorHaloSize, min: 0.5, max: 2.5, step: 0.05,
      onChange: (value: number) => setVisual({ doorHaloSize: value }),
    },
    'Door pulse amount': {
      value: visual.doorPulseAmount, min: 0, max: 0.2, step: 0.005,
      onChange: (value: number) => setVisual({ doorPulseAmount: value }),
    },
    'Neon core width': {
      value: visual.neonCoreWidth, min: 0.005, max: 0.06, step: 0.001,
      onChange: (value: number) => setVisual({ neonCoreWidth: value }),
    },
    'Neon core opacity': {
      value: visual.neonCoreOpacity, min: 0, max: 1, step: 0.01,
      onChange: (value: number) => setVisual({ neonCoreOpacity: value }),
    },
    'Neon core tint': {
      value: visual.neonCoreTint,
      onChange: (value: string) => setVisual({ neonCoreTint: value }),
    },
    'Neon body saturation': {
      value: visual.neonBodySaturation, min: 0.5, max: 2.5, step: 0.05,
      onChange: (value: number) => setVisual({ neonBodySaturation: value }),
    },
    'Neon body brightness': {
      value: visual.neonBodyBrightness, min: 0.5, max: 2, step: 0.05,
      onChange: (value: number) => setVisual({ neonBodyBrightness: value }),
    },
    'Neon glow strength': {
      value: visual.neonGlowStrength, min: 0, max: 2.5, step: 0.05,
      onChange: (value: number) => setVisual({ neonGlowStrength: value }),
    },
    'Copy values': button(() => {
      const state = useWorldStore.getState();
      console.info('[projects visual tuning]', JSON.stringify({
        exposure: state.projectsExposure,
        vignette: state.projectsVignette,
        ...state.projectsVisual,
      }, null, 2));
    }),
  });
  return <Leva collapsed />;
}
