// vite.config.js
import { defineConfig } from "file:///D:/Trinity%20Optinum%20Vision%20Center/Capstone/node_modules/vite/dist/node/index.js";
import mkcert from "file:///D:/Trinity%20Optinum%20Vision%20Center/Capstone/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
var vite_config_default = defineConfig(({ command, mode }) => {
  const isDev = command === "serve";
  return {
    base: "/",
    plugins: [
      ...isDev ? [
        mkcert({
          hosts: ["localhost", "127.0.0.1", process.env.DEV_HOST || "192.168.100.7"]
        })
      ] : []
    ],
    server: {
      port: 3e3,
      host: true,
      https: isDev,
      open: true,
      headers: {
        "Permissions-Policy": "camera=(self)"
      }
    },
    preview: {
      port: 3001,
      host: true
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
      rollupOptions: {
        input: {
          main: "index.html",
          "try-on": "try-on.html",
          "admin-dashboard": "admin-dashboard.html",
          about: "about.html",
          contact: "contact.html",
          preorder: "preorder.html",
          preorders: "preorders.html",
          "preorder-confirmation": "preorder-confirmation.html"
        }
      }
    },
    assetsInclude: ["**/*.glb", "**/*.gltf"],
    optimizeDeps: {
      include: ["three"]
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || (isDev ? "development" : "production"))
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxUcmluaXR5IE9wdGludW0gVmlzaW9uIENlbnRlclxcXFxDYXBzdG9uZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcVHJpbml0eSBPcHRpbnVtIFZpc2lvbiBDZW50ZXJcXFxcQ2Fwc3RvbmVcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L1RyaW5pdHklMjBPcHRpbnVtJTIwVmlzaW9uJTIwQ2VudGVyL0NhcHN0b25lL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCBta2NlcnQgZnJvbSAndml0ZS1wbHVnaW4tbWtjZXJ0JztcclxuXHJcbi8vIE5ldGxpZnktZnJpZW5kbHkgVml0ZSBjb25maWc6IHVzZSBta2NlcnQgb25seSBpbiBkZXYsIHBsYWluIGJ1aWxkIGZvciBDSVxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XHJcbiAgY29uc3QgaXNEZXYgPSBjb21tYW5kID09PSAnc2VydmUnO1xyXG4gIHJldHVybiB7XHJcbiAgICBiYXNlOiAnLycsXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIC4uLihpc0RldlxyXG4gICAgICAgID8gW1xyXG4gICAgICAgICAgICBta2NlcnQoe1xyXG4gICAgICAgICAgICAgIGhvc3RzOiBbJ2xvY2FsaG9zdCcsICcxMjcuMC4wLjEnLCBwcm9jZXNzLmVudi5ERVZfSE9TVCB8fCAnMTkyLjE2OC4xMDAuNyddXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICBdXHJcbiAgICAgICAgOiBbXSlcclxuICAgIF0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuICAgICAgaHR0cHM6IGlzRGV2LFxyXG4gICAgICBvcGVuOiB0cnVlLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ1Blcm1pc3Npb25zLVBvbGljeSc6ICdjYW1lcmE9KHNlbGYpJ1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgcHJldmlldzoge1xyXG4gICAgICBwb3J0OiAzMDAxLFxyXG4gICAgICBob3N0OiB0cnVlXHJcbiAgICB9LFxyXG4gICAgYnVpbGQ6IHtcclxuICAgICAgb3V0RGlyOiAnZGlzdCcsXHJcbiAgICAgIGFzc2V0c0RpcjogJ2Fzc2V0cycsXHJcbiAgICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBpbnB1dDoge1xyXG4gICAgICAgICAgbWFpbjogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgJ3RyeS1vbic6ICd0cnktb24uaHRtbCcsXHJcbiAgICAgICAgICAnYWRtaW4tZGFzaGJvYXJkJzogJ2FkbWluLWRhc2hib2FyZC5odG1sJyxcclxuICAgICAgICAgIGFib3V0OiAnYWJvdXQuaHRtbCcsXHJcbiAgICAgICAgICBjb250YWN0OiAnY29udGFjdC5odG1sJyxcclxuICAgICAgICAgIHByZW9yZGVyOiAncHJlb3JkZXIuaHRtbCcsXHJcbiAgICAgICAgICBwcmVvcmRlcnM6ICdwcmVvcmRlcnMuaHRtbCcsXHJcbiAgICAgICAgICAncHJlb3JkZXItY29uZmlybWF0aW9uJzogJ3ByZW9yZGVyLWNvbmZpcm1hdGlvbi5odG1sJ1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGFzc2V0c0luY2x1ZGU6IFsnKiovKi5nbGInLCAnKiovKi5nbHRmJ10sXHJcbiAgICBvcHRpbWl6ZURlcHM6IHtcclxuICAgICAgaW5jbHVkZTogWyd0aHJlZSddXHJcbiAgICB9LFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WIHx8IChpc0RldiA/ICdkZXZlbG9wbWVudCcgOiAncHJvZHVjdGlvbicpKVxyXG4gICAgfVxyXG4gIH07XHJcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVQsU0FBUyxvQkFBb0I7QUFDdFYsT0FBTyxZQUFZO0FBR25CLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsU0FBUyxLQUFLLE1BQU07QUFDakQsUUFBTSxRQUFRLFlBQVk7QUFDMUIsU0FBTztBQUFBLElBQ0wsTUFBTTtBQUFBLElBQ04sU0FBUztBQUFBLE1BQ1AsR0FBSSxRQUNBO0FBQUEsUUFDRSxPQUFPO0FBQUEsVUFDTCxPQUFPLENBQUMsYUFBYSxhQUFhLFFBQVEsSUFBSSxZQUFZLGVBQWU7QUFBQSxRQUMzRSxDQUFDO0FBQUEsTUFDSCxJQUNBLENBQUM7QUFBQSxJQUNQO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixTQUFTO0FBQUEsUUFDUCxzQkFBc0I7QUFBQSxNQUN4QjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxJQUNSO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixXQUFXO0FBQUEsTUFDWCxXQUFXO0FBQUEsTUFDWCxlQUFlO0FBQUEsUUFDYixPQUFPO0FBQUEsVUFDTCxNQUFNO0FBQUEsVUFDTixVQUFVO0FBQUEsVUFDVixtQkFBbUI7QUFBQSxVQUNuQixPQUFPO0FBQUEsVUFDUCxTQUFTO0FBQUEsVUFDVCxVQUFVO0FBQUEsVUFDVixXQUFXO0FBQUEsVUFDWCx5QkFBeUI7QUFBQSxRQUMzQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxlQUFlLENBQUMsWUFBWSxXQUFXO0FBQUEsSUFDdkMsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLE9BQU87QUFBQSxJQUNuQjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sd0JBQXdCLEtBQUssVUFBVSxRQUFRLElBQUksYUFBYSxRQUFRLGdCQUFnQixhQUFhO0FBQUEsSUFDdkc7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
