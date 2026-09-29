import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage'],
    web_accessible_resources: [
      {
        resources: ['inject-provider.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
