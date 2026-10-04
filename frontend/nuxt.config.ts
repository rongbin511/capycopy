// https://nuxt.com/docs/api/configuration/nuxt-config
const API_TARGET = 'http://127.0.0.1:8000'

/** Keep Nuxt Icon requests on the Nuxt server, not the Python `/api` proxy. */
function isNuxtIconApiPath(url: string | undefined): boolean {
  const pathname = (url || '').split('?')[0]
  return pathname.startsWith('/api/_nuxt_icon') || pathname.startsWith('/_nuxt_icon')
}

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt'],
  icon: {
    // Avoid clashing with FastAPI routes under `/api/*`.
    localApiEndpoint: '/_nuxt_icon',
    fallbackToApi: false,
    serverBundle: {
      collections: ['lucide'],
    },
    clientBundle: {
      scan: true,
    },
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
  ],
  css: [
    '~/assets/css/main.css',
    '~/assets/css/markdown.css',
    '~/assets/css/answer.css',
    'katex/dist/katex.min.css',
  ],
  app: {
    head: {
      title: 'Exam Papers',
      htmlAttrs: { lang: 'en' },
    },
  },
  colorMode: {
    preference: 'light',
  },
  vite: {
    server: {
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
          bypass(req) {
            if (isNuxtIconApiPath(req.url)) {
              return (req.url || '').split('?')[0]
            }
          },
        },
        '/papers': { target: API_TARGET, changeOrigin: true },
      },
    },
  },
  nitro: {
    preset: 'static',
    devProxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/papers': { target: API_TARGET, changeOrigin: true },
    },
  },
  runtimeConfig: {
    apiProxyTarget: API_TARGET,
    public: {
      apiBase: '',
    },
  },
})
