module.exports = {
  apps: [{
    name: 'adm-backend',
    script: './src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '512M',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads', 'prisma/dev.db'],
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
