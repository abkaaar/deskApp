import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig(async () => {
  // ESM-only package — must use dynamic import (CJS require fails with ERR_PACKAGE_PATH_NOT_EXPORTED)
  const { default: tailwindcss } = await import('@tailwindcss/vite')

  return {
    main: {
      build: {
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'lib/main/main.ts'),
          },
        },
      },
      resolve: {
        alias: {
          '@/app': resolve(__dirname, 'app'),
          '@/lib': resolve(__dirname, 'lib'),
          '@/resources': resolve(__dirname, 'resources'),
        },
      },
      plugins: [externalizeDepsPlugin()],
    },
    preload: {
      build: {
        rollupOptions: {
          input: {
            preload: resolve(__dirname, 'lib/preload/preload.ts'),
          },
        },
      },
      resolve: {
        alias: {
          '@/app': resolve(__dirname, 'app'),
          '@/lib': resolve(__dirname, 'lib'),
          '@/resources': resolve(__dirname, 'resources'),
        },
      },
      plugins: [externalizeDepsPlugin()],
    },
    renderer: {
      root: './app',
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'app/index.html'),
          },
        },
      },
      resolve: {
        alias: {
          '@/app': resolve(__dirname, 'app'),
          '@/lib': resolve(__dirname, 'lib'),
          '@/resources': resolve(__dirname, 'resources'),
        },
      },
      plugins: [tailwindcss(), react()],
    },
  }
})
