import { useMemo } from 'react';
import { EffectComposer, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { useWorldStore } from './store';

export default function PostProcessing({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const progress = useWorldStore((state) => state.progress);
  const transitioning = useWorldStore((state) => state.transitioning);
  const offset = useMemo(() => {
    const pulse = !reduced && transitioning ? Math.sin(Math.min(1, progress) * Math.PI) * .0035 : 0;
    return new Vector2(pulse, pulse * .72);
  }, [progress, reduced, transitioning]);
  if (mobile || reduced) return null;
  return (
    <EffectComposer multisampling={0}>
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={.12} />
      <Noise opacity={.035} />
      <Vignette offset={.24} darkness={.69} />
    </EffectComposer>
  );
}
