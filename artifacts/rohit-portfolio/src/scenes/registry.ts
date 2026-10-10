export type SceneId = 'hero' | 'about' | 'projects' | 'skills' | 'experience' | 'contact';
export type SceneDefinition = {
  id: SceneId;
  title: string;
  label: string;
  image: string;
  depthMap: string;
  layers?: string[];
  focalPoint: { x: number; y: number };
  parallaxStrength: number;
  fogColor: string;
  ambientAudioKey: string;
  mode: 'layered' | 'depth';
};

export type SceneTuning = {
  parallaxStrength: number;
  depthScale: number;
  fogDensity: number;
  transitionDuration: number;
  focalPoint: { x: number; y: number };
};

export const sceneRegistry: SceneDefinition[] = [
  { id: 'hero', title: 'The overgrown city', label: 'The threshold', image: '/assets/scenes/01-hero.webp', depthMap: '/assets/depth/01-hero-depth.png', layers: ['/assets/layers/01-hero-far.webp', '/assets/layers/01-hero-mid.webp', '/assets/layers/01-hero-near.webp'], focalPoint: { x: .63, y: .72 }, parallaxStrength: .035, fogColor: '#1c3a52', ambientAudioKey: 'city-wind', mode: 'layered' },
  { id: 'about', title: 'A little about me', label: 'The wayfinder', image: '/assets/scenes/02-about.webp', depthMap: '/assets/depth/02-about-depth.png', focalPoint: { x: .5, y: .6 }, parallaxStrength: .025, fogColor: '#1c3a52', ambientAudioKey: 'distant-rain', mode: 'depth' },
  { id: 'projects', title: 'Projects', label: 'Field notes', image: '/assets/scenes/03-projects.webp', depthMap: '/assets/depth/03-projects-depth.png', layers: ['/assets/layers/03-projects-far.webp', '/assets/layers/03-projects-mid.webp', '/assets/layers/03-projects-near.webp'], focalPoint: { x: .58, y: .56 }, parallaxStrength: .03, fogColor: '#193547', ambientAudioKey: 'broken-signal', mode: 'layered' },
  { id: 'skills', title: 'Skills', label: 'The toolkit', image: '/assets/scenes/04%20-%20skills.webp', depthMap: '/assets/depth/04%20-%20skills-depth.png', focalPoint: { x: .51, y: .58 }, parallaxStrength: .02, fogColor: '#20394a', ambientAudioKey: 'canopy', mode: 'depth' },
  { id: 'experience', title: 'Experience', label: 'The path behind', image: '/assets/scenes/05%20-%20experience.webp', depthMap: '/assets/depth/05%20-%20experience-depth.png', focalPoint: { x: .47, y: .62 }, parallaxStrength: .022, fogColor: '#1b3445', ambientAudioKey: 'distant-bells', mode: 'depth' },
  { id: 'contact', title: 'Contact', label: 'A signal sent', image: '/assets/scenes/06%20-%20contact.webp', depthMap: '/assets/depth/06%20-%20contact-depth.png', focalPoint: { x: .56, y: .55 }, parallaxStrength: .018, fogColor: '#1d3c4e', ambientAudioKey: 'night-birds', mode: 'depth' },
];

export const sceneById = (id: SceneId) => sceneRegistry.find((scene) => scene.id === id)!;
