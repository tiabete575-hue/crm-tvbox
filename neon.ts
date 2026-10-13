import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  preview: {
    buckets: {
      "crm-tvbox": { access: "public_read" },
    },
    functions: {
      api: { name: "api", source: "./hello.ts" },
    },
  },
});
