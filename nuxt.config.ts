// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  components: [{ path: "~/components", pathPrefix: false }],
  app: {
    pageTransition: { name: "page", mode: "out-in" },
    head: {
      title: "Talentia School",
      titleTemplate: "%s · Talentia School",
      meta: [
        { name: "description", content: "Talentia School — platform manajemen sekolah modern untuk guru, siswa, dan orang tua." },
      ],
    },
  },
  runtimeConfig: {
    public: {
      showDemoAccounts: process.env.NUXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true",
    },
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT || '587',
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
    smtpFrom: process.env.SMTP_FROM,
    publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:3000',
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/ui",
    "nuxt-auth-utils",
  ],
  css: ["~/assets/css/tailwind.css"],
});
