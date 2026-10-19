import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Points,
  ShaderMaterial,
  Texture,
} from 'three';

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
const damp = (current: number, target: number, delta: number) =>
  current + (target - current) * Math.min(1, delta * 1.3);

function ParallaxLayer({
  texture,
  index,
  opacity,
  pointer,
  reduced,
  children,
}: {
  texture: Texture | undefined;
  index: number;
  opacity: number;
  pointer: ProjectsStorefrontProps['pointer'];
  reduced: boolean;
  children?: ReactNode;
}) {
  const group = useRef<Group>(null);
  const multiplier = PARALLAX[index] ?? 1;

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
            color="#b4c8c7"
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

function SignAnchor({ debug }: { debug: boolean }) {
  return (
    <mesh
      name="projects-sign-anchor"
      position={[(0.57 - 0.5) * PLANE_W, (0.5 - 0.35) * PLANE_H, 0.015]}
      visible={debug}
      renderOrder={10}
    >
      <planeGeometry args={[0.41 * PLANE_W, 0.19 * PLANE_H]} />
      <meshBasicMaterial
        color="#c9d7d0"
        wireframe
        transparent
        opacity={0.27}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function DoorInteraction({ opacity, active, onActiveChange }: { opacity: number; active: boolean; onActiveChange: (active: boolean) => void }) {
  const [opened, setOpened] = useState(false);
  const clickDoor = useCallback(() => {
    console.log('door clicked');
    setOpened(true);
  }, []);
  const x = (0.585 - 0.5) * PLANE_W;
  const y = (0.5 - 0.6) * PLANE_H;

  return (
    <group position={[x, y, 0.08]}>
      <Html center transform={false} zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
        <button
          type="button"
          aria-label="Enter the storefront"
          aria-describedby={opened ? 'projects-door-note' : undefined}
          onClick={clickDoor}
           onPointerEnter={() => onActiveChange(true)}
           onPointerLeave={() => onActiveChange(false)}
           onFocus={() => onActiveChange(true)}
           onBlur={() => onActiveChange(false)}
          tabIndex={opacity > 0.05 ? 0 : -1}
          style={{
            position: 'relative',
            width: 'clamp(44px, 4.5vw, 66px)',
            height: 'clamp(76px, 10vh, 112px)',
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
            style={{
              position: 'absolute',
              left: '50%',
              top: '-21px',
              transform: 'translateX(-50%)',
              opacity: active ? 0.9 : 0,
              transition: 'opacity 220ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            ENTER
          </span>
        </button>
        {opened && (
          <div
            id="projects-door-note"
            role="status"
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'max-content',
              maxWidth: 'min(260px, 70vw)',
              padding: '10px 13px',
              border: '1px solid rgba(201, 176, 151, .28)',
              background: 'rgba(7, 13, 20, .88)',
              color: 'rgba(232, 220, 192, .9)',
              font: '10px/1.65 "Special Elite", monospace',
              textAlign: 'center',
              letterSpacing: '.025em',
              pointerEvents: 'none',
            }}
          >
            The journal will arrive later.
          </div>
        )}
      </Html>
    </group>
  );
}

function DoorGlow({ reduced, active }: { reduced: boolean; active: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (!material.current) return;
    if (reduced) {
      material.current.uniforms.uOpacity.value = active ? 0.095 : 0.075;
      return;
    }
    const time = clock.elapsedTime;
    const breathe = Math.sin(time * (Math.PI * 2 / 7.2)) * 0.0045;
    const flicker = Math.sin(time * 2.13) > 0.996 ? -0.016 : 0;
    material.current.uniforms.uOpacity.value = Math.max(0.052, 0.075 + (active ? 0.018 : 0) + breathe + flicker);
  });

  return (
    <mesh position={[(0.585 - 0.5) * PLANE_W, (0.5 - 0.6) * PLANE_H, 0.045]} renderOrder={4}>
      <planeGeometry args={[3.1, 4.3]} />
      <shaderMaterial
        ref={material}
        vertexShader={fogVertexShader}
        fragmentShader={`
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * vec2(1.0, 1.2);
            float halo = exp(-dot(p, p) * 15.0);
            float core = exp(-dot(p, p) * 55.0);
            float alpha = (halo * 0.7 + core * 0.3) * uOpacity;
            gl_FragColor = vec4(vec3(0.88, 0.12, 0.08), alpha);
          }
        `}
        uniforms={{ uOpacity: { value: 0.075 } }}
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

function Background({ image, opacity }: { image: Texture; opacity: number }) {
  return (
    <mesh position={[0, 0, -1.25]}>
      <planeGeometry args={[PLANE_W, PLANE_H]} />
      <meshBasicMaterial
        map={image}
        color="#b9cecc"
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
  return (
    <group>
      <Background image={image} opacity={opacity} />
      <ParallaxLayer texture={layers[0]} index={0} opacity={opacity} pointer={pointer} reduced={reduced} />
      <ParallaxLayer texture={layers[1]} index={1} opacity={opacity} pointer={pointer} reduced={reduced}>
        <SignAnchor debug={debug} />
        <DoorGlow reduced={reduced} active={doorActive} />
        <DoorInteraction opacity={opacity} active={doorActive} onActiveChange={setDoorActive} />
      </ParallaxLayer>
      <ParallaxLayer texture={layers[2]} index={2} opacity={opacity} pointer={pointer} reduced={reduced} />
      <StreetFog reduced={reduced} opacity={opacity} />
      <StreetDust reduced={reduced} opacity={opacity} />
    </group>
  );
}
