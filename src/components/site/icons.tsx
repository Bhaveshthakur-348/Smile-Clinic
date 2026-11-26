type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const ToothIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}>
    <path d="M8 4c-2.5 0-4 2-4 4.5 0 3.5 2 6 2.5 9 .3 1.8 1 3 2 3s1.5-1.6 1.9-3.6C10.7 15.6 11.3 15 12 15s1.3.6 1.6 1.9c.4 2 .9 3.6 1.9 3.6s1.7-1.2 2-3c.5-3 2.5-5.5 2.5-9C20 6 18.5 4 16 4c-1.6 0-2.6 1-4 1S9.6 4 8 4z" />
  </svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base} strokeWidth={2.6}><path d="M5 12l5 5 9-10" /></svg>
);
export const ChatIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" /></svg>
);
export const PhoneIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
);
export const BackIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...base}><path d="M15 5l-7 7 7 7" /></svg>
);
