// Customize the site here. Null links show an honest 'profile coming soon' panel.
export const profile = {
  name: 'Ranjan Kumar', shortName: 'ranjan', initials: 'RK',
  role: 'Creative Frontend Developer & Designer',
  location: 'India', available: true,
  email: null as string | null,
  portrait: null as string | null, // Use a local image path such as /portrait.webp.
  socials: { github: null, linkedin: null, instagram: null, whatsapp: null, upwork: null, fiverr: null } as Record<string, string | null>,
};
export const projects = [
  { id: 'forma', title: 'Forma Studio', category: 'Web design', type: 'Modern Business Website', description: 'An architectural studio concept where thoughtful space meets a quietly confident digital presence.', tags: ['React', 'CSS3', 'Responsive'], color: 'sand', year: 'CONCEPT 01' },
  { id: 'aura', title: 'AURA Audio', category: 'Development', type: 'E-commerce Website', description: 'An immersive storefront concept for sound that moves you. Product discovery with a considered shopping experience.', tags: ['React', 'JavaScript', 'E-commerce'], color: 'purple', year: 'CONCEPT 02' },
  { id: 'orbit', title: 'Orbit Analytics', category: 'Development', type: 'Dashboard UI', description: 'A clear, focused analytics dashboard concept that turns complex numbers into everyday decisions.', tags: ['React', 'UI/UX', 'Data visualization'], color: 'blue', year: 'CONCEPT 03' },
  { id: 'offscript', title: 'Offscript®', category: 'Web design', type: 'Creative Landing Page', description: 'An expressive editorial landing page concept for a new generation of independent thinkers.', tags: ['HTML5', 'CSS3', 'Creative direction'], color: 'orange', year: 'CONCEPT 04' },
  { id: 'flow', title: 'Flow Workspace', category: 'Development', type: 'React.js Web Application', description: 'A calm task management concept. A little less friction, a lot more focus.', tags: ['React', 'JavaScript', 'UI/UX'], color: 'mint', year: 'CONCEPT 05' },
  { id: 'chromatic', title: 'Chromatic Explorations', category: 'Creative design', type: 'Photoshop Creative Design', description: 'An editable visual direction study exploring bold typography, light, and dimensional composition.', tags: ['Design study', 'Art direction', 'Web graphics'], color: 'pink', year: 'CONCEPT 06' },
];
export type Project = typeof projects[number];
