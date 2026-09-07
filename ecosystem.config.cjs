module.exports = {
  apps: [
    {
      name: 'membrane',
      script: 'dist/server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: 3000,
        PGLITE_DATA_DIR: './data/pglite',
      },
    },
  ],
}
