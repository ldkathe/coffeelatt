import { defineConfig } from 'vite';

// base: './' hace que el build funcione igual sirviendo desde
// https://usuario.github.io/coffeelatt/ que desde un dominio propio en la raíz.
export default defineConfig({
  base: './',
});
