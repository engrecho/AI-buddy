module.exports = {
  apps: [{
    name: 'ai-work-buddy-api',
    script: 'server/index.js',
    cwd: '/www/wwwroot/ai-work-buddy',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
  }],
};
