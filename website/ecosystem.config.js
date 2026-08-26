module.exports = {
  apps: [
    {
      name: 'pcb-website',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 4000,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123'
      }
    }
  ]
};
