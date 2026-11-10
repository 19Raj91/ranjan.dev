export const projectTypes = ['Custom website', 'React application', 'Landing page', 'Website redesign', 'Design & graphics', 'AI creative solution', 'Something else'];
export function validateInquiry(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {error: 'Please provide your project details.'} as const;
  const raw = input as Record<string, unknown>;
  const data = Object.fromEntries(['name', 'email', 'projectType', 'budget', 'message'].map(k => [k, typeof raw[k] === 'string' ? raw[k].trim() : ''])) as Record<'name'|'email'|'projectType'|'budget'|'message', string>;
  if (data.name.length < 2 || data.name.length > 100) return {error: 'Please enter a name between 2 and 100 characters.'} as const;
  if (data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return {error: 'Please enter a valid email address.'} as const;
  if (!projectTypes.includes(data.projectType)) return {error: 'Please choose a project type.'} as const;
  if (!data.budget || data.budget.length > 100) return {error: 'Please share your budget or enter “Let’s discuss”.'} as const;
  if (data.message.length < 20 || data.message.length > 5000) return {error: 'Please describe your project in 20–5,000 characters.'} as const;
  return {data} as const;
}
