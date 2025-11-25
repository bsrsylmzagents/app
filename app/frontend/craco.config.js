// craco.config.js
const path = require("path");
require("dotenv").config();

// Environment variable overrides
const config = {
  disableHotReload: process.env.DISABLE_HOT_RELOAD === "true",
  enableVisualEdits: process.env.REACT_APP_ENABLE_VISUAL_EDITS === "true",
  enableHealthCheck: process.env.ENABLE_HEALTH_CHECK === "true",
};

// Conditionally load visual editing modules only if enabled
let babelMetadataPlugin;
let setupDevServer;

if (config.enableVisualEdits) {
  babelMetadataPlugin = require("./plugins/visual-edits/babel-metadata-plugin");
  setupDevServer = require("./plugins/visual-edits/dev-server-setup");
}

// Conditionally load health check modules only if enabled
let WebpackHealthPlugin;
let setupHealthEndpoints;
let healthPluginInstance;

if (config.enableHealthCheck) {
  WebpackHealthPlugin = require("./plugins/health-check/webpack-health-plugin");
  setupHealthEndpoints = require("./plugins/health-check/health-endpoints");
  healthPluginInstance = new WebpackHealthPlugin();
}

const webpackConfig = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {

      // Disable hot reload completely if environment variable is set
      if (config.disableHotReload) {
        // Remove hot reload related plugins
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          return !(plugin.constructor.name === 'HotModuleReplacementPlugin');
        });

        // Disable watch mode
        webpackConfig.watch = false;
        webpackConfig.watchOptions = {
          ignored: /.*/, // Ignore all files
        };
      } else {
        // Add ignored patterns to reduce watched directories
        webpackConfig.watchOptions = {
          ...webpackConfig.watchOptions,
          ignored: [
            '**/node_modules/**',
            '**/.git/**',
            '**/build/**',
            '**/dist/**',
            '**/coverage/**',
            '**/public/**',
          ],
        };
      }

      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      return webpackConfig;
    },
  },
};

// Only add babel plugin if visual editing is enabled
if (config.enableVisualEdits) {
  webpackConfig.babel = {
    plugins: [babelMetadataPlugin],
  };
}

// Setup dev server with visual edits and/or health check
if (config.enableVisualEdits || config.enableHealthCheck) {
  webpackConfig.devServer = (devServerConfig) => {
    // Apply visual edits dev server setup if enabled
    if (config.enableVisualEdits && setupDevServer) {
      devServerConfig = setupDevServer(devServerConfig);
    }

    // Add health check endpoints if enabled
    if (config.enableHealthCheck && setupHealthEndpoints && healthPluginInstance) {
      const originalSetupMiddlewares = devServerConfig.setupMiddlewares;

      devServerConfig.setupMiddlewares = (middlewares, devServer) => {
        // Call original setup if exists
        if (originalSetupMiddlewares) {
          middlewares = originalSetupMiddlewares(middlewares, devServer);
        }

        // Setup health endpoints
        setupHealthEndpoints(devServer, healthPluginInstance);

        return middlewares;
      };
    }

    return devServerConfig;
  };
}

// Always configure devServer for WebSocket port fix (even if visual edits/health check are disabled)
if (!webpackConfig.devServer) {
  webpackConfig.devServer = (devServerConfig) => {
    // HARDCODE WebSocket to use port 3000 (dev server port) - NEVER use 443
    // Only set webSocketURL inside client, host and port are at root level
    if (!devServerConfig.client) {
      devServerConfig.client = {};
    }
    // Force WebSocket to use localhost:3000/ws (dev server port)
    devServerConfig.client.webSocketURL = {
      hostname: 'localhost',
      pathname: '/ws',
      port: 3000,  // HARDCODED to dev server port
      protocol: 'ws',  // Force ws:// not wss://
    };
    
    return devServerConfig;
  };
} else {
  // If devServer already exists, enhance it with WebSocket fix
  const originalDevServer = webpackConfig.devServer;
  webpackConfig.devServer = (devServerConfig) => {
    const config = originalDevServer ? originalDevServer(devServerConfig) : devServerConfig;
    
    // HARDCODE WebSocket to use port 3000 - NEVER use 443
    // Only set webSocketURL inside client, host and port are at root level
    if (!config.client) {
      config.client = {};
    }
    // Force WebSocket to use localhost:3000/ws (dev server port)
    config.client.webSocketURL = {
      hostname: 'localhost',
      pathname: '/ws',
      port: 3000,  // HARDCODED to dev server port
      protocol: 'ws',  // Force ws:// not wss://
    };
    
    return config;
  };
}

module.exports = webpackConfig;
