import { defineConfig } from "cypress";

export default defineConfig({
  projectId: "sp9pad",
  e2e: {
    baseUrl: "http://localhost:5173",
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    video: false,
    setupNodeEvents(on, config) {
      // Node event listeners
    },
  },
});
