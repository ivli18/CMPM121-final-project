// https://vitejs.dev/config/
export default {
  base: process.env.REPO_NAME || '/project',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    outDir: "dist",
    sourcemap: true,
  },
};
