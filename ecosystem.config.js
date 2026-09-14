module.exports = {
  apps: [
    {
      name: 'next-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3051',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};