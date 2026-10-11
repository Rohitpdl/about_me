import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide, Group, Mesh, PerspectiveCamera, Points, ShaderMaterial, Texture, Vector2, Vector3 } from 'three';
import { loadSceneAssets, getFallbackAssets, preloadNextScene } from './assetTextures';
import { sceneById, sceneRegistry, type SceneId } from './registry';
import { useWorldStore } from './store';
const PostProcessing = lazy(() => import('./PostProcessing'));

class SceneCanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[scene engine] WebGL canvas failed; using the CSS atmosphere fallback.', error);
  }

  render() {
    return this.state.failed
      ? <div className="webgl-world webgl-fallback" aria-hidden="true" />
      : this.props.children;
  }
}

const PLANE_W = 33;
const PLANE_H = 18.56;
const vertexShader = `
  varying vec2 vUv;
  varying float vHeight;
  uniform sampler2D uDepth;
  uniform float uDepthScale;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uParallaxStrength;
  void main() {
    float depth = texture2D(uDepth, uv).r;
    vec2 parallaxOffset = uPointer * (depth - 0.5) * uParallaxStrength;
    vUv = clamp(uv + parallaxOffset, vec2(0.001), vec2(0.999));
    vec3 p = position;
    float breathe = sin(uv.x * 8.0 + uTime * .18) * .013;
    p.z += (depth - .48) * uDepthScale * .68 + breathe;
    vHeight = depth;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const fragmentShader = `
  varying vec2 vUv;
  varying float vHeight;
  uniform sampler2D uImage;
  uniform float uOpacity;
  void main() {
    vec4 sceneColor = texture2D(uImage, vUv);
    vec3 nightGrade = sceneColor.rgb * vec3(.74, .88, .93);
    float haze = smoothstep(.34, .96, vUv.y) * .13;
    nightGrade += vec3(.035, .085, .095) * haze;
    gl_FragColor = vec4(nightGrade, sceneColor.a * uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function usePointer() {
  const point = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse) return;
    const onMove = (event: PointerEvent) => {
      point.current.x = (event.clientX / window.innerWidth - .5) * 2;
      point.current.y = (event.clientY / window.innerHeight - .5) * 2;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);
  return point;
}

type PointerRef = ReturnType<typeof usePointer>;

function FogAndDust({ density, reduced }: { density: number; reduced: boolean }) {
  const points = useRef<Points>(null);
  const fogSheet = useRef<Mesh>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      positions[i * 3] = (Math.sin(i * 127.1) * .5 + .5) * 36 - 18;
      positions[i * 3 + 1] = (Math.sin(i * 311.7) * .5 + .5) * 19 - 9.5;
      positions[i * 3 + 2] = -2 + (Math.sin(i * 74.7) * .5 + .5) * 11;
    }
    const result = new BufferGeometry();
    result.setAttribute('position', new BufferAttribute(positions, 3));
    return result;
  }, []);
  useFrame((state) => {
    if (reduced) return;
    if (points.current) {
      points.current.rotation.y = Math.sin(state.clock.elapsedTime * .08) * .025;
      points.current.position.y = Math.sin(state.clock.elapsedTime * .12) * .12;
    }
    if (fogSheet.current) {
      fogSheet.current.position.x = Math.sin(state.clock.elapsedTime * .065) * 1.25;
      fogSheet.current.position.y = -2.9 + Math.cos(state.clock.elapsedTime * .08) * .1;
    }
  });
  return (
    <>
      <points ref={points} geometry={geometry}>
        <pointsMaterial color="#bcd9c8" size={.038} transparent opacity={Math.min(.66, .25 + density * 1.6)} sizeAttenuation depthWrite={false} blending={AdditiveBlending} />
      </points>
      <mesh ref={fogSheet} position={[0, -2.9, 2.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[46, 20]} />
        <meshBasicMaterial color="#376d70" transparent opacity={density * .19} depthWrite={false} />
      </mesh>
    </>
  );
}

function CameraRig({ pointer, reduced }: { pointer: PointerRef; reduced: boolean }) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const scratch = useMemo(() => new Vector3(), []);
  useFrame((state, delta) => {
    const { currentScene, transitionFrom, progress, sceneTuning } = useWorldStore.getState();
    const heroAboutTransition = (transitionFrom === 'hero' || transitionFrom === 'about') && (currentScene === 'hero' || currentScene === 'about');
    const travel = heroAboutTransition && !reduced ? progress : 0;
    const heroFocus = sceneTuning.hero.focalPoint;
    const aboutFocus = sceneTuning.about.focalPoint;
    const xFocus = heroAboutTransition ? heroFocus.x + (aboutFocus.x - heroFocus.x) * travel : sceneTuning[currentScene].focalPoint.x;
    const yFocus = heroAboutTransition ? heroFocus.y + (aboutFocus.y - heroFocus.y) * travel : sceneTuning[currentScene].focalPoint.y;
    const desktop = !reduced && !window.matchMedia('(pointer: coarse)').matches;
    const sx = desktop ? pointer.current.x : Math.sin(state.clock.elapsedTime * .22) * .18;
    const sy = desktop ? pointer.current.y : Math.cos(state.clock.elapsedTime * .18) * .12;
    const parallax = (sceneTuning[currentScene]?.parallaxStrength ?? .025) * 18;
    const targetX = reduced ? 0 : (xFocus - .5) * 5.6 - sx * parallax;
    const targetY = reduced ? 0 : (.5 - yFocus) * 3.2 + sy * parallax * .7 + travel * .4;
    const targetZ = heroAboutTransition ? 16.2 - travel * 3.6 : 16.2;
    const ease = 1 - Math.exp(-delta * 2.8);
    scratch.set(targetX, targetY, targetZ);
    camera.position.lerp(scratch, ease);
    const baseFov = 44 + travel * 13;
    if (Math.abs(camera.fov - baseFov) > .01) {
      camera.fov += (baseFov - camera.fov) * ease;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(targetX * .35, targetY * .35, 0);
  });
  return null;
}

function DepthScene({ sceneId, opacity, texture, depth, depthScale, parallaxStrength, pointer, reduced }: { sceneId: SceneId; opacity: number; texture: Texture; depth: Texture; depthScale: number; parallaxStrength: number; pointer: PointerRef; reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(() => new ShaderMaterial({
    uniforms: {
      uImage: { value: texture }, uDepth: { value: depth }, uDepthScale: { value: depthScale }, uTime: { value: 0 }, uOpacity: { value: opacity },
      uPointer: { value: new Vector2() }, uParallaxStrength: { value: parallaxStrength },
    },
    vertexShader, fragmentShader, transparent: true, side: DoubleSide, depthWrite: false,
  }), [depth, depthScale, parallaxStrength, texture]);
  useFrame((state) => {
    material.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
    material.uniforms.uOpacity.value = opacity;
    material.uniforms.uDepthScale.value = depthScale;
    material.uniforms.uPointer.value.set(reduced ? 0 : pointer.current.x, reduced ? 0 : -pointer.current.y);
    material.uniforms.uParallaxStrength.value = parallaxStrength;
    if (mesh.current) {
      const point = useWorldStore.getState().sceneTuning[sceneId].focalPoint;
      mesh.current.position.x = (point.x - .5) * -.44;
      mesh.current.position.y = (point.y - .5) * .3;
    }
  });
  return <mesh ref={mesh} position={[0, 0, .1]} material={material}><planeGeometry args={[PLANE_W, PLANE_H, 112, 64]} /></mesh>;
}

function LayerScene({ opacity, image, layers, pointer, reduced }: { opacity: number; image: Texture; layers: Texture[]; pointer: PointerRef; reduced: boolean }) {
  const group = useRef<Group>(null);
  useFrame((state, delta) => {
    if (reduced) return;
    if (!group.current) return;
    const aimX = pointer.current.x * .11;
    const aimY = pointer.current.y * .075;
    group.current.position.x += (aimX - group.current.position.x) * Math.min(1, delta * 1.3);
    group.current.position.y += (aimY - group.current.position.y) * Math.min(1, delta * 1.3);
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0, -1.25]}>
        <planeGeometry args={[PLANE_W, PLANE_H]} />
        <meshStandardMaterial map={image} color="#b9cecc" emissive="#243d46" emissiveIntensity={.3} roughness={1} transparent opacity={opacity} />
      </mesh>
      {layers.slice(0, 3).map((layer, index) => (
        <mesh key={index} position={[0, -.08 * index, -.5 + index * .53]}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
          <meshBasicMaterial map={layer} color="#b4c8b7" transparent opacity={opacity * (.84 + index * .05)} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function SceneVisual({ sceneId, opacity, pointer, reduced }: { sceneId: SceneId; opacity: number; pointer: PointerRef; reduced: boolean }) {
  const definition = sceneById(sceneId);
  const fallback = useMemo(() => getFallbackAssets(definition), [definition]);
  const [assets, setAssets] = useState(fallback);
  const tune = useWorldStore((state) => state.sceneTuning[sceneId]);
  useEffect(() => {
    let alive = true;
    setAssets(fallback);
    void loadSceneAssets(sceneId).then((result) => { if (alive) setAssets(result); });
    preloadNextScene(sceneId);
    return () => { alive = false; };
  }, [fallback, sceneId]);
  return (
    <group>
      {definition.mode === 'layered'
        ? <LayerScene opacity={opacity} image={assets.image} layers={assets.layers} pointer={pointer} reduced={reduced} />
        : <group>
          <mesh position={[0, 0, -1.1]}>
            <planeGeometry args={[PLANE_W, PLANE_H]} />
            <meshBasicMaterial map={assets.image} color="#627a7b" transparent opacity={opacity * .48} depthWrite={false} />
          </mesh>
          <DepthScene sceneId={sceneId} opacity={opacity} texture={assets.image} depth={assets.depth} depthScale={tune.depthScale} parallaxStrength={tune.parallaxStrength} pointer={pointer} reduced={reduced} />
        </group>}
    </group>
  );
}

function WorldContents({ mobile, reduced }: { mobile: boolean; reduced: boolean }) {
  const active = useWorldStore((state) => state.currentScene);
  const transitionFrom = useWorldStore((state) => state.transitionFrom);
  const progress = useWorldStore((state) => state.progress);
  const sceneTuning = useWorldStore((state) => state.sceneTuning);
  const pointer = usePointer();
  const canTravel = (transitionFrom === 'hero' || transitionFrom === 'about') && (active === 'hero' || active === 'about');
  const crossfading = transitionFrom !== null && !canTravel;
  const primaryScene = transitionFrom ?? active;
  const otherScene: SceneId = canTravel ? (primaryScene === 'hero' ? 'about' : 'hero') : active;
  const firstOpacity = canTravel || crossfading ? 1 - progress : 1;
  const secondOpacity = canTravel || crossfading ? progress : 0;
  const density = sceneTuning[active].fogDensity;
  const fogColor = sceneById(active).fogColor;
  return (
    <>
      <color attach="background" args={['#070d1a']} />
      <fogExp2 attach="fog" args={[new Color(fogColor), density]} />
      <ambientLight intensity={.78} color="#a8c9d1" />
      <directionalLight intensity={.8} color="#bddbd8" position={[-5, 8, 11]} />
      <pointLight intensity={3.4} color="#ffb347" distance={15} position={[3.2, -3.4, 4.5]} />
      <CameraRig pointer={pointer} reduced={reduced} />
      <SceneVisual sceneId={primaryScene} opacity={firstOpacity} pointer={pointer} reduced={reduced} />
      {(canTravel || crossfading) && <SceneVisual sceneId={otherScene} opacity={secondOpacity} pointer={pointer} reduced={reduced} />}
      <FogAndDust density={density} reduced={reduced} />
      {!mobile && !reduced && <Suspense fallback={null}><PostProcessing mobile={false} reduced={false} /></Suspense>}
      <Preload all />
    </>
  );
}

export default function WorldCanvas() {
  const mobile = useMemo(() => window.matchMedia('(max-width: 700px), (pointer: coarse)').matches, []);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [webglAvailable, setWebglAvailable] = useState(false);

  useEffect(() => {
    let context: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      const probe = document.createElement('canvas');
      context = probe.getContext('webgl2') as WebGL2RenderingContext | null;
      if (!context) context = probe.getContext('webgl') as WebGLRenderingContext | null;
      context?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      context = null;
    }

    if (!context) {
      console.warn('[scene engine] WebGL is unavailable; using the CSS atmosphere fallback.');
    }
    setWebglAvailable(Boolean(context));
  }, []);

  if (!webglAvailable) {
    return <div className="webgl-world webgl-fallback" aria-hidden="true" />;
  }

  return (
    <SceneCanvasBoundary>
      <div className="webgl-world" aria-hidden="true">
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 16.2], fov: 44, near: .1, far: 100 }}
          gl={{ alpha: false, antialias: !mobile, powerPreference: 'high-performance' }}
          fallback={<div className="webgl-fallback" />}
        >
          <Suspense fallback={null}><WorldContents mobile={mobile} reduced={reduced} /></Suspense>
        </Canvas>
      </div>
    </SceneCanvasBoundary>
  );
}
