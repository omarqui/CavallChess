import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, padding: 0.2, resizeOptions: { background: '#18201c' } },
    apple: { ...minimal2023Preset.apple, padding: 0.15, resizeOptions: { background: '#18201c' } },
  },
  images: ['public/favicon.svg'],
});
