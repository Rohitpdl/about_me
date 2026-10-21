export type PortfolioProject = {
  title: string;
  tools: string[];
  status: string;
  year: string;
  description: string;
  repo: string;
  sketch: string;
};

export const portfolioContent = {
  name: 'Rohit Paudel',
  roles: ['Game Dev', 'Marketing', 'Illustration'],
  heroLine: 'Passionate about coding, gaming, and everything in between.',
  bio: "Hey, I'm Rohit! A 21-year-old explorer of tech, creativity, and life. Love anything that scratches my brain.",
  age: 21,
  links: {
    email: 'paudelrohit016@gmail.com',
    linkedin: 'https://www.linkedin.com/in/rohit-paudel-788a71282/',
    instagram: 'https://www.instagram.com/_.loathsome/',
    github: 'https://github.com/Rohitpdl',
  },
  projects: [
    {
      title: 'Terrain Generation using CNN-modified Heightmap',
      tools: ['C#'],
      status: 'Work in progress',
      year: '20__',
      description: 'I have been exploring how a heightmap can become a landscape with more character. This page is a place to collect the experiments and the questions still open.',
      repo: 'https://github.com/Rohitpdl',
      sketch: '/assets/sketches/sketch-terrain.svg',
    },
    {
      title: 'Style Transfer API for Unity',
      tools: ['Python', 'Unity'],
      status: 'Project',
      year: '20__',
      description: 'A small bridge between painterly image treatments and a Unity workflow. I am keeping notes here on the shapes, colors, and technical choices behind the experiment.',
      repo: 'https://github.com/Rohitpdl',
      sketch: '/assets/sketches/sketch-style-transfer.svg',
    },
    {
      title: 'Platformer Game',
      tools: ['Python', 'pygame'],
      status: 'Computer graphics project',
      year: '20__',
      description: 'A compact platforming study, built around a character, a jump, and the next safe place to land. This page leaves room for the little discoveries made while shaping the movement.',
      repo: 'https://github.com/Rohitpdl',
      sketch: '/assets/sketches/sketch-platformer.svg',
    },
    {
      title: 'File Compression Tool',
      tools: ['Python'],
      status: 'Data structures project',
      year: '20__',
      description: 'An exercise in making a larger piece of information fit into a smaller one. I am saving the structure and reasoning here, with plenty of room for a better diagram later.',
      repo: 'https://github.com/Rohitpdl',
      sketch: '/assets/sketches/sketch-compression.svg',
    },
  ] satisfies PortfolioProject[],
  skills: [
    { name: 'Python', level: 'Solid' },
    { name: 'Unity', level: 'Intermediate' },
    { name: 'Node.js', level: 'Intermediate' },
    { name: 'Design', level: 'Intermediate' },
    { name: 'C#', level: 'Intermediate' },
    { name: 'C++', level: 'Intermediate' },
    { name: 'Godot', level: 'Intermediate' },
  ],
  experience: [
    { role: 'Undergraduate student', place: 'Sagarmatha Engineering College', dates: 'Current' },
    { role: 'Treasurer', place: 'COESIS', dates: '2024–2026' },
    { role: 'Marketing Intern', place: 'Nano Syllabus', dates: 'Current' },
  ],
};
