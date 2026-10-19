import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { Vector2 } from 'three';
import { useWorldStore } from './store';

export default function PostProcessing({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const progress = useWorldStore((state) => state.progress);
  const transitioning = useWorldStore((state) => state.transitioning);
  const pixelRatio = useThree((state) => state.gl.getPixelRatio());
  const offset = useMemo(() => {
    const pulse = !reduced && transitioning ? Math.sin(Math.min(1, progress) * Math.PI) * .0035 : 0;
    const pixelScale = 1 / Math.sqrt(Math.max(1, pixelRatio));
    return new Vector2(pulse * pixelScale, pulse * .72 * pixelScale);
  }, [pixelRatio, progress, reduced, transitioning]);
  if (mobile || reduced) return null;
  return (
    <EffectComposer multisampling={0}>
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={.12} />
      <Noise opacity={.035} />
      <Vignette offset={.24} darkness={.69} />
    </EffectComposer>
  );
}
