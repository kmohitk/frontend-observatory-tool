import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obs: {
          bg: '#0B1220',
          card: '#1F2937',
          text: '#E5E7EB',
          muted: '#9CA3AF',
          border: '#374151',
        },
      },
    },
  },
  plugins: [],
};

export default config;
