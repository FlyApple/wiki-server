
export const config_development = {
  // 服务名
  server_name: 'Server',
  // 必须英文，如果为空将无法设置一些项目，比如cookie等
  server_code: 1000,
  server_codename: 'webserver',

  //
  server: {
    bind_address: '0.0.0.0',
    legacy_port: '3000',
    secure_port: '3004',
  },
  cdn: true,
  redis: {
    host: '<Your Redis Host>',
    port: 6379,
    password: '<Your Redis Password>',
    prefix: '<Your Redis Prefix>',
  },
  mysql: {
    host: '<Your MYSQL Host>',
    port: 3306,
    user: '<Your MYSQL Username>',
    password: '<Your MYSQL Password>',
    database: '<Your MYSQL Database>',
  },

  // Server config item:
  signed_key: '<Your Signed Key>',
  // 允许跨域访问
  // Access-Control-Allow-Origin: 
  allow_domains: [],
  // Activate account URL:
  activate_account_url: '<Your Email Active Link>/verifying',
};
