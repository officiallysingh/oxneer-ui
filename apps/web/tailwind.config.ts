import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import uiConfig from '@oxneer/ui/tailwind.config';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
  presets: [uiConfig as Config],
  plugins: [tailwindcssAnimate],
};

export default config;
