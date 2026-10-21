import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  PerspectiveCamera,
  Points,
  ShaderMaterial,
  Texture,
} from 'three';
import { emit } from '../lib/events';
import { enterJournal, useWorldStore } from './store';

type ProjectsStorefrontProps = {
  image: Texture;
  layers: Texture[];
  opacity: number;
  pointer: { current: { x: number; y: number } };
  reduced: boolean;
  debug: boolean;
};

const PLANE_W = 33;
const PLANE_H = 18.56;
const LAYER_Z = [-0.5, 0.03, 0.56] as const;
const PARALLAX = [0.52, 1, 1.72] as const;
const BASE_CAMERA_FOV = 44;
const CAMERA_DISTANCE = 16.2;
const damp = (current: number, target: number, delta: number) =>
  current + (target - current) * Math.min(1, delta * 1.3);

function projectsCameraFov(
  width: number,
  height: number,
  focalPoint: { x: number; y: number },
) {
  const aspect = width / height;
  const cameraTargetX = (focalPoint.x - 0.5) * 5.6;
  const cameraTargetY = (0.5 - focalPoint.y) * 3.2;
  const signCenterX = (0.57 - 0.5) * PLANE_W;
  const signHalfWidth = 0.41 * PLANE_W * 0.5;
  const signCenterY = (0.5 - 0.35) * PLANE_H;
  const signHalfHeight = 0.19 * PLANE_H * 0.5;
  const doorCenterX = (0.585 - 0.5) * PLANE_W;
  const halfWidth = Math.max(
    Math.abs(signCenterX - cameraTargetX) + signHalfWidth + 0.2,
    Math.abs(doorCenterX - cameraTargetX) + 0.8,
  );
  const requiredViewWidth = halfWidth / 0.45;
  const doorCenterY = (0.5 - 0.6) * PLANE_H;
  const halfHeight = Math.max(
    Math.abs(signCenterY - cameraTargetY) + signHalfHeight,
    Math.abs(doorCenterY - cameraTargetY) + 2.15,
  );
  const requiredViewHeight = Math.max(
    requiredViewWidth / aspect,
    halfHeight / 0.45,
  );
  const baseViewHeight =
    2 * CAMERA_DISTANCE * Math.tan((BASE_CAMERA_FOV * Math.PI) / 360);
  const viewHeight = Math.max(baseViewHeight, requiredViewHeight);
  return (2 * Math.atan(viewHeight / (2 * CAMERA_DISTANCE)) * 180) / Math.PI;
}

function useSceneHtmlPortal() {
  const portalElement = useThree((state) =>
    state.gl.domElement.parentElement?.parentElement?.parentElement?.parentElement,
  );
  return useMemo(
    () => ({ current: portalElement ?? document.body }),
    [portalElement],
  );
}

function ParallaxLayer({
  texture,
  index,
  opacity,
  pointer,
  reduced,
  children,
  exposure,
}: {
  texture: Texture | undefined;
  index: number;
  opacity: number;
  pointer: ProjectsStorefrontProps['pointer'];
  reduced: boolean;
  children?: ReactNode;
  exposure: number;
}) {
  const group = useRef<Group>(null);
  const multiplier = PARALLAX[index] ?? 1;
  const tint = useMemo(
    () => new Color('#b4c8c7').multiplyScalar(exposure),
    [exposure],
  );

  useFrame((_, delta) => {
    const current = group.current;
    if (!current) return;
    if (reduced) {
      current.position.x = 0;
      current.position.y = 0;
      return;
    }
    const aimX = pointer.current.x * 0.11 * multiplier;
    const aimY = pointer.current.y * 0.075 * multiplier;
    current.position.x = damp(current.position.x, aimX, delta);
    current.position.y = damp(current.position.y, aimY, delta);
  });

  return (
    <group ref={group} position-z={LAYER_Z[index] ?? 0}>
      {texture && (
        <mesh>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
          <meshBasicMaterial
            map={texture}
            color={tint}
            transparent
            opacity={opacity * (0.84 + index * 0.05)}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      )}
      {children}
    </group>
  );
}

function SignAnchor({ debug, reduced }: { debug: boolean; reduced: boolean }) {
  const currentScene = useWorldStore((state) => state.currentScene);
  const visual = useWorldStore((state) => state.projectsVisual);
  const opacity = useWorldStore((state) => state.projectsVignette);
  const focalPoint = useWorldStore((state) => state.sceneTuning.projects.focalPoint);
  const canvasHeight = useThree((state) => state.size.height);
  const canvasWidth = useThree((state) => state.size.width);
  const signRef = useRef<HTMLButtonElement>(null);
  const deadLetterRef = useRef<HTMLSpanElement>(null);
  const letterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const timers = useRef<number[]>([]);
  const [engaged, setEngaged] = useState(false);
  const [sparks, setSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const engagement = useRef(false);
  const nextSparkId = useRef(0);
  const x = (0.57 - 0.5) * PLANE_W;
  const y = (0.5 - 0.35) * PLANE_H;
  const boardWidth = 0.41 * PLANE_W;
  const boardHeight = 0.19 * PLANE_H;
  const cameraFov = currentScene === 'projects'
    ? projectsCameraFov(canvasWidth, canvasHeight, focalPoint)
    : BASE_CAMERA_FOV;
  const pixelsPerWorldUnit =
    canvasHeight / (2 * Math.tan((cameraFov * Math.PI) / 360) * CAMERA_DISTANCE);
  const projectedWidth = boardWidth * pixelsPerWorldUnit * 0.6;
  const projectedHeight = boardHeight * pixelsPerWorldUnit * 0.6;
  const portal = useSceneHtmlPortal();

  useEffect(() => {
    document.documentElement.style.setProperty('--projects-vignette', String(opacity));
    return () => {
      document.documentElement.style.removeProperty('--projects-vignette');
    };
  }, [opacity]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
    const later = (callback: () => void, delay: number) => {
      timers.current.push(window.setTimeout(callback, delay));
    };
    const randomBetween = (min: number, max: number) =>
      Math.floor(min + Math.random() * (max - min + 1));
    const liveLetters = ['P', 'R', 'O', 'E', 'C', 'T', 'S'];

    clearTimers();
    letterRefs.current.forEach((letter) => {
      letter?.classList.remove('is-lit', 'is-flickering');
    });
    deadLetterRef.current?.classList.remove('is-flickering');
    signRef.current?.classList.remove('is-surge-dim', 'is-surge-pop');
    setSparks([]);

    if (currentScene !== 'projects') return clearTimers;

    if (reduced) {
      letterRefs.current.forEach((letter, index) => {
        if (index !== 3) letter?.classList.add('is-lit');
      });
      return clearTimers;
    }

    const flickerBurst = (index: number, count: number, done: () => void) => {
      let remaining = count;
      const flicker = () => {
        const letter = letterRefs.current[index];
        if (!letter) {
          done();
          return;
        }
        const character = 'PROJECTS'[index] ?? '';
        const duration = character === 'O' ? randomBetween(40, 75) : randomBetween(45, 160);
        letter.classList.add('is-flickering');
        emit('sign:flicker', { letter: character });
        later(() => {
          letter.classList.remove('is-flickering');
          remaining -= 1;
          if (remaining > 0) later(flicker, randomBetween(45, 130));
          else done();
        }, duration);
      };
      flicker();
    };

    const scheduleFlicker = (index: number) => {
      const character = 'PROJECTS'[index] ?? '';
      const interval = character === 'T'
        ? randomBetween(1500, 3500)
        : character === 'O'
          ? randomBetween(1700, 4300)
          : randomBetween(1800, 6000);
      later(() => {
        flickerBurst(index, randomBetween(2, 4), () => scheduleFlicker(index));
      }, interval);
    };

    liveLetters.forEach((character, ordinal) => {
      const index = 'PROJECTS'.indexOf(character);
      later(() => letterRefs.current[index]?.classList.add('is-lit'), 100 + ordinal * 145);
    });
    later(() => {
      liveLetters.forEach((character) => scheduleFlicker('PROJECTS'.indexOf(character)));
    }, 1200);

    const scheduleSurge = () => {
      later(() => {
        signRef.current?.classList.add('is-surge-dim');
        later(() => {
          signRef.current?.classList.remove('is-surge-dim');
          signRef.current?.classList.add('is-surge-pop');
          later(() => {
            signRef.current?.classList.remove('is-surge-pop');
            scheduleSurge();
          }, 110);
        }, 120);
      }, randomBetween(8000, 15000));
    };
    scheduleSurge();

    const scheduleSparks = () => {
      later(() => {
        const count = randomBetween(6, 10);
        const id = nextSparkId.current++;
        setSparks(Array.from({ length: count }, () => ({
          id: id * 10 + Math.random(),
          x: randomBetween(-65, 65),
          y: randomBetween(-105, -45),
        })));
        emit('sign:spark', { count });
        later(() => setSparks([]), 480);
        scheduleSparks();
      }, randomBetween(6000, 12000));
    };
    scheduleSparks();

    return () => {
      clearTimers();
      setSparks([]);
    };
  }, [currentScene, reduced]);

  const sputterDeadLetter = useCallback(() => {
    if (reduced || engagement.current) return;
    engagement.current = true;
    deadLetterRef.current?.classList.add('is-flickering');
    emit('sign:flicker', { letter: 'J' });
    window.setTimeout(() => deadLetterRef.current?.classList.remove('is-flickering'), 260);
  }, [reduced]);

  const leaveSign = useCallback(() => {
    engagement.current = false;
    setEngaged(false);
  }, []);

  return (
    <group name="projects-sign-anchor" position={[x, y, 0.015]}>
      <mesh visible={debug} renderOrder={10}>
        <planeGeometry args={[boardWidth, boardHeight]} />
        <meshBasicMaterial
          color="#c9d7d0"
          wireframe
          transparent
          opacity={0.27}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <Html transform center portal={portal} zIndexRange={[30, 0]} style={{ pointerEvents: 'auto' }}>
          <button
            ref={signRef}
            type="button"
            aria-label="Projects: open the journal"
            onClick={enterJournal}
            onPointerEnter={() => { setEngaged(true); sputterDeadLetter(); }}
            onPointerLeave={leaveSign}
            onFocus={() => { setEngaged(true); sputterDeadLetter(); }}
            onBlur={leaveSign}
            tabIndex={currentScene === 'projects' ? 0 : -1}
            className={`projects-neon-sign${engaged ? ' is-engaged' : ''}${sparks.length ? ' is-sparking' : ''}`}
            style={{
              width: `${projectedWidth}px`,
              height: `${projectedHeight}px`,
              '--sign-font-size': `${projectedWidth * 0.18}px`,
              '--neon-core-width': `${visual.neonCoreWidth}em`,
              '--neon-core-opacity': visual.neonCoreOpacity,
              '--neon-core-tint': visual.neonCoreTint,
              '--neon-body-saturation': visual.neonBodySaturation,
              '--neon-body-brightness': visual.neonBodyBrightness,
              '--neon-glow-strength': visual.neonGlowStrength,
            } as CSSProperties}
          >
            <span className="neon-board-glow" aria-hidden="true" />
            <span className="neon-letters" aria-hidden="true">
              {'PROJECTS'.split('').map((letter, index) => (
                  <span
                  key={`${letter}-${index}`}
                  ref={(node) => {
                    letterRefs.current[index] = node;
                    if (letter === 'J') deadLetterRef.current = node;
                  }}
                  className={`neon-letter${letter === 'J' ? ' neon-letter-dead' : ''}`}
                    data-char={letter}
                  >
                    {letter}
                  </span>
                ))}
            </span>
            <svg className="neon-vines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
                <g className="vine vine-one">
                  <path className="vine-stem" d="M84 0 C86 100 50 134 71 217 S69 332 37 402" />
                  <path className="vine-leaves" d="M80 28 C50 3 36 12 61 39 C70 48 77 39 80 28Z M87 43 C110 9 127 17 103 48 C94 57 87 52 87 43Z M75 57 C38 39 27 54 60 69 C69 73 74 66 75 57Z M91 68 C129 40 140 55 105 78 C96 84 91 77 91 68Z M72 85 C42 68 31 83 60 96 C67 100 72 93 72 85Z M94 99 C123 75 135 88 104 108 C97 112 93 106 94 99Z M69 112 C47 96 37 110 61 122 C67 125 70 119 69 112Z M91 127 C113 108 125 120 99 136 C93 140 90 134 91 127Z" />
                  <path className="vine-leaves" d="M65 211 C39 190 28 202 54 225 C62 232 67 221 65 211Z M76 227 C103 201 116 215 88 239 C80 245 76 237 76 227Z M61 242 C34 229 27 242 53 254 C60 257 63 250 61 242Z M81 260 C107 244 116 257 89 270 C82 274 79 267 81 260Z M56 275 C35 265 29 277 52 285 C58 287 59 281 56 275Z" />
                </g>
                <g className="vine vine-two">
                  <path className="vine-stem" d="M576 0 C568 102 601 141 580 229 S615 343 649 393" />
                  <path className="vine-leaves" d="M571 25 C541 2 529 14 555 39 C564 47 570 36 571 25Z M579 40 C609 12 623 26 592 49 C584 55 579 49 579 40Z M565 57 C531 39 520 53 552 68 C560 72 565 66 565 57Z M582 73 C617 49 629 63 596 83 C588 88 582 81 582 73Z M561 90 C534 75 524 89 552 101 C559 104 562 98 561 90Z M581 107 C612 89 623 102 592 119 C585 123 580 115 581 107Z M567 126 C543 111 534 123 558 137 C565 141 569 133 567 126Z" />
                  <path className="vine-leaves" d="M570 205 C546 185 535 197 559 220 C567 227 572 215 570 205Z M582 221 C608 198 621 211 592 234 C584 240 580 231 582 221Z M566 238 C540 225 532 237 558 250 C565 253 568 246 566 238Z M585 256 C612 239 622 252 593 267 C586 271 583 264 585 256Z M575 274 C552 263 544 275 568 285 C574 288 577 280 575 274Z" />
                </g>
                <g className="vine vine-three">
                  <path className="vine-stem" d="M916 0 C902 84 943 147 914 212 S923 325 968 365" />
                  <path className="vine-leaves" d="M910 28 C882 5 870 17 894 42 C902 50 909 39 910 28Z M919 43 C949 16 962 29 932 53 C924 59 919 52 919 43Z M902 60 C870 42 860 56 892 71 C900 75 904 68 902 60Z M922 76 C957 51 969 65 936 86 C928 91 922 84 922 76Z M897 94 C870 78 861 92 888 105 C896 108 899 101 897 94Z M917 111 C948 92 960 105 929 123 C921 127 916 119 917 111Z M905 130 C881 114 871 127 896 141 C903 145 907 137 905 130Z" />
                  <path className="vine-leaves" d="M901 211 C878 190 867 202 890 225 C898 232 903 221 901 211Z M914 228 C941 205 953 218 924 241 C916 247 912 238 914 228Z M895 245 C870 231 862 243 888 256 C895 259 898 252 895 245Z M917 263 C943 247 953 260 925 274 C918 278 915 270 917 263Z M908 281 C885 269 877 281 900 292 C907 295 910 287 908 281Z" />
                </g>
            </svg>
            <span className="neon-sparks" aria-hidden="true">
              {sparks.map((spark) => (
                <span
                  key={spark.id}
                  className="neon-spark"
                  style={{
                    '--spark-x': `${spark.x}px`,
                    '--spark-y': `${spark.y}px`,
                  } as CSSProperties}
                />
              ))}
            </span>
          </button>
        </Html>
    </group>
  );
}

function DoorInteraction({ opacity, active, onActiveChange }: { opacity: number; active: boolean; onActiveChange: (active: boolean) => void }) {
  const clickDoor = useCallback(enterJournal, []);
  const portal = useSceneHtmlPortal();
  const cameraFov = useThree((state) => state.size);
  const activeScene = useWorldStore((state) => state.currentScene);
  const focalPoint = useWorldStore((state) => state.sceneTuning.projects.focalPoint);
  const fov = activeScene === 'projects'
    ? projectsCameraFov(cameraFov.width, cameraFov.height, focalPoint)
    : BASE_CAMERA_FOV;
  const doorScale = Math.tan((BASE_CAMERA_FOV * Math.PI) / 360) /
    Math.tan((fov * Math.PI) / 360);
  const x = (0.585 - 0.5) * PLANE_W;
  const y = (0.5 - 0.6) * PLANE_H;

  return (
    <group position={[x, y, 0.08]}>
      <Html center transform={false} portal={portal} zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          className="projects-door-hitbox"
          aria-label="Enter the journal"
          onClick={clickDoor}
           onPointerEnter={() => onActiveChange(true)}
           onPointerLeave={() => onActiveChange(false)}
           onFocus={() => onActiveChange(true)}
           onBlur={() => onActiveChange(false)}
          tabIndex={opacity > 0.05 ? 0 : -1}
          style={{
            position: 'relative',
            width: `max(44px, ${Math.min(66, window.innerWidth * 0.045) * doorScale}px)`,
            height: `max(64px, ${Math.min(112, window.innerHeight * 0.1) * doorScale}px)`,
            padding: 0,
            border: 0,
            borderRadius: 2,
            background: 'transparent',
            color: '#eadcc8',
            cursor: 'pointer',
            pointerEvents: opacity > 0.05 ? 'auto' : 'none',
            opacity,
            outlineOffset: 4,
            font: '10px "Special Elite", monospace',
            letterSpacing: '.18em',
            textShadow: '0 1px 8px #170908',
          }}
        >
          <span
            aria-hidden="true"
            className="projects-enter-label"
            style={{
              position: 'absolute',
              left: '50%',
              top: 'calc(100% + 14px)',
              transform: 'translateX(-50%)',
              opacity: active ? 0.9 : 0,
              transition: 'opacity 220ms ease',
              whiteSpace: 'nowrap',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          >
            ENTER
          </span>
        </button>
      </Html>
    </group>
  );
}

function DoorGlow({ reduced, active }: { reduced: boolean; active: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const visual = useWorldStore((state) => state.projectsVisual);
  useFrame(({ clock }) => {
    if (!material.current) return;
    if (reduced) {
      material.current.uniforms.uOpacity.value = visual.doorHaloIntensity * (active ? 1.12 : 1);
      return;
    }
    const pulse = Math.sin(clock.elapsedTime * (Math.PI * 2 / 9.5)) * visual.doorPulseAmount;
    material.current.uniforms.uOpacity.value = visual.doorHaloIntensity * (1 + pulse + (active ? 0.12 : 0));
  });

  return (
    <mesh position={[(0.585 - 0.5) * PLANE_W, (0.5 - 0.6) * PLANE_H, 0.045]} renderOrder={4}>
      <planeGeometry args={[3.5 * visual.doorHaloSize, 2.2 * visual.doorHaloSize]} />
      <shaderMaterial
        ref={material}
        vertexShader={fogVertexShader}
        fragmentShader={`
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            p.y *= 1.5;
            float radius = dot(p, p);
            float feather = 1.0 - smoothstep(0.58, 1.0, radius);
            float alpha = exp(-radius * 4.2) * feather * uOpacity;
            gl_FragColor = vec4(vec3(1.0, 0.018, 0.008), alpha);
          }
        `}
        uniforms={{ uOpacity: { value: visual.doorHaloIntensity } }}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={DoubleSide}
      />
    </mesh>
  );
}

const fogVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fogFragmentShader = `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * vec2(1.0, 1.65);
    float soft = exp(-dot(p, p) * 8.5);
    float bands = 0.74 + 0.12 * sin(vUv.x * 18.0 + uTime * 0.18)
                        + 0.08 * sin(vUv.x * 31.0 - uTime * 0.12);
    float edge = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.77, 1.0, vUv.y));
    gl_FragColor = vec4(vec3(0.34, 0.49, 0.49), soft * bands * edge * uOpacity);
  }
`;

function StreetFog({ reduced, opacity }: { reduced: boolean; opacity: number }) {
  const fogRefs = useRef<Array<ShaderMaterial | null>>([]);
  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    fogRefs.current.forEach((mat) => {
      if (mat) mat.uniforms.uTime.value = reduced ? 0 : time;
    });
    if (reduced) return;
    const group = fogGroup.current;
    if (group) group.position.x = ((time * 0.11) % 12) - 6;
  });
  const fogGroup = useRef<Group>(null);
  const fogMaterial = (index: number) => (
    <shaderMaterial
      ref={(node) => { fogRefs.current[index] = node; }}
      vertexShader={fogVertexShader}
      fragmentShader={fogFragmentShader}
      uniforms={{ uOpacity: { value: opacity * 0.15 }, uTime: { value: 0 } }}
      transparent
      depthWrite={false}
      side={DoubleSide}
    />
  );

  return (
    <group ref={fogGroup} position={[0, -7.65, 1.35]} renderOrder={5}>
      {[0, 1, 2].map((index) => (
        <mesh key={index} position={[index * 5.1 - 4.8, index % 2 ? 0.24 : -0.12, 0]}>
          <planeGeometry args={[10.5, 3.4]} />
          {fogMaterial(index)}
        </mesh>
      ))}
    </group>
  );
}

function StreetDust({ reduced, opacity }: { reduced: boolean; opacity: number }) {
  const points = useRef<Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array([
      -8.2, -6.5, 1.5, -5.4, -7.8, 1.6, -2.7, -6.1, 1.7, 0.6, -8.3, 1.5,
      3.7, -6.7, 1.6, 6.3, -7.9, 1.5, 8.8, -6.3, 1.7, -0.6, -5.5, 1.8,
    ]);
    const result = new BufferGeometry();
    result.setAttribute('position', new BufferAttribute(positions, 3));
    return result;
  }, []);

  useFrame(({ clock }, delta) => {
    if (reduced || !points.current) return;
    const positions = points.current.geometry.attributes.position;
    const time = clock.elapsedTime;
    for (let i = 0; i < positions.count; i += 1) {
      const nextX = positions.getX(i) + delta * 0.035;
      positions.setX(i, nextX > 10 ? -10 : nextX);
      positions.setY(i, positions.getY(i) + Math.sin(time * 0.4 + i) * delta * 0.006);
    }
    positions.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} renderOrder={6}>
      <pointsMaterial
        color="#d5cfb0"
        size={0.045}
        transparent
        opacity={opacity * 0.52}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function Background({ image, opacity, exposure }: { image: Texture; opacity: number; exposure: number }) {
  return (
    <mesh position={[0, 0, -1.25]}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshBasicMaterial
        map={image}
        color={new Color('#b9cecc').multiplyScalar(exposure)}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

export default function ProjectsStorefront({
  image,
  layers,
  opacity,
  pointer,
  reduced,
  debug,
}: ProjectsStorefrontProps) {
  const [doorActive, setDoorActive] = useState(false);
  const exposure = useWorldStore((state) => state.projectsExposure);
  const currentScene = useWorldStore((state) => state.currentScene);
  const focalPoint = useWorldStore((state) => state.sceneTuning.projects.focalPoint);
  const canvas = useThree((state) => state.size);
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    const perspectiveCamera = camera as PerspectiveCamera;
    perspectiveCamera.fov = currentScene === 'projects'
      ? projectsCameraFov(canvas.width, canvas.height, focalPoint)
      : BASE_CAMERA_FOV;
    perspectiveCamera.updateProjectionMatrix();
  }, [camera, canvas.height, canvas.width, currentScene, focalPoint.x, focalPoint.y]);
  return (
    <group>
      <Background image={image} opacity={opacity} exposure={exposure} />
      <ParallaxLayer texture={layers[0]} index={0} opacity={opacity} pointer={pointer} reduced={reduced} exposure={exposure} />
      <ParallaxLayer texture={layers[1]} index={1} opacity={opacity} pointer={pointer} reduced={reduced} exposure={exposure}>
        <SignAnchor debug={debug} reduced={reduced} />
        <DoorGlow reduced={reduced} active={doorActive} />
        <DoorInteraction opacity={opacity} active={doorActive} onActiveChange={setDoorActive} />
      </ParallaxLayer>
      <ParallaxLayer texture={layers[2]} index={2} opacity={opacity} pointer={pointer} reduced={reduced} exposure={exposure} />
      <StreetFog reduced={reduced} opacity={opacity} />
      <StreetDust reduced={reduced} opacity={opacity} />
    </group>
  );
}
