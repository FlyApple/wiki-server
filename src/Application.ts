
//
import * as fs from "fs";

import * as net from "net";

import * as http from "http";
import * as https from "https";
import * as koa from "koa";

import * as database from "./database/database";
import * as redis from "./redis/redis";

import {Singleton, NewInstance, GetInstance} from "./utils/singleton";
import {Logger} from "./utils/logger";

import config from "./config/index";
import RouterServer from "./router/routerserver";
import mx from "./utils";
import * as perform from "./utils/performance";


//
export default class Application extends Singleton<Application> {
    private _root:string = "./";
    private _mode:"development"|"production"  = "production";
    private _logger: Logger|null = null;

    private _cache: any;
    private _database: any;

    private http_server:any;
    private https_server:any;
    private http_router:any;
    private https_router:any;

    constructor() {
        super();

        this._root = process.cwd();
        this._mode = process.env.NODE_ENV == "development" ? "development" : "production";

        this._logger = NewInstance(Logger);
        this._logger.Init(this._root);
        this._logger.AddLoggerItem("info", true, false, false, Logger.LEVEL_ALL);
        this._logger.AddLoggerItem("server", false, true, false, Logger.LEVEL_ALL);
        this._logger.AddLoggerItem("redis", true, true, true, Logger.LEVEL_ALL);
        this._logger.AddLoggerItem("mysql", true, true, true, Logger.LEVEL_ALL);
    }

    public init() : boolean {
        //
        this._logger?.info("Mode : " + (this._mode == "development" ? "(development)" : "(production)"));
        this._logger?.info("Work Root : " + this._root);

        //
        redis.RedisCache.LogFunc = (level, value) => {
          if(this._logger) {
            if(level == 3) {
              this._logger.log(Logger.LEVEL_ERROR, "redis", value);
            } else if(level == 2) {
              this._logger.log(Logger.LEVEL_WARN, "redis", value);
            } else if(level == 1) {
              this._logger.log(Logger.LEVEL_INFO, "redis", value);
            } else {
              this._logger.log(Logger.LEVEL_INFO, "info", value);
            }
          }
        }
        redis.Cache_GetInstance(2, config.redis).then((v) => {
          this._cache = v;
        });


        //
        database.Database.LogFunc = (level, value) => {
          if(this._logger) {
            if(level == 3) {
              this._logger.log(Logger.LEVEL_ERROR, "mysql", value);
            } else if(level == 2) {
              this._logger.log(Logger.LEVEL_WARN, "mysql", value);
            } else if(level == 1) {
              this._logger.log(Logger.LEVEL_INFO, "mysql", value);
            } else {
              this._logger.log(Logger.LEVEL_INFO, "info", value);
            }
          }
        }
        this._database = database.Database_GetInstance();

        //
        if (!this.initServer()) {
          return false;
        }

        return true;
    }

    private initServer() : boolean {
        let http_app:koa = new koa();
        let https_app:koa = new koa();
        http_app.proxy = config.cdn;
        https_app.proxy = config.cdn;

        this.http_server = http.createServer(http_app.callback());
        this.http_router = new RouterServer(this.http_server, http_app);

        let https_options: https.ServerOptions|null = null;
        if(this._mode == "production") {
          https_options = {
            maxVersion:"TLSv1.3",
            minVersion:"TLSv1",
            key:fs.readFileSync('./keys/https-prod.key'),
            cert:fs.readFileSync('./keys/https-prod.pem')
          };
        } else {
          https_options = {
              maxVersion:"TLSv1.3",
              minVersion:"TLSv1",
              key:fs.readFileSync('./keys/https.key'),
              cert:fs.readFileSync('./keys/https.crt')
          };
        }

        this.https_server = https.createServer(https_options, https_app.callback());
        this.https_router = new RouterServer(this.https_server, https_app, true); 

        //
        this.http_router.init(this._root, this._mode);
        this.https_router.init(this._root, this._mode);

        //
        this.http_server.listen(config.server.legacy_port, config.server.bind_address, (err, address) => {
          if(err) {
            this.onHTTPError(err);
            return;
          }

          this.onHTTPListening();
        });
        this.https_server.listen(config.server.secure_port, config.server.bind_address, (err, address) => {
          if(err) {
            this.onHTTPSError(err);
            return;
          }

          this.onHTTPSListening();
        });
        return true;
    }

    public run() : number {
      let tick = Date.now();
      return this.runImpl(tick);
    }

    private runImpl(tick:number) : number {
      let result = 0;

      let last = tick;
      let status = setTimeout(() => {
        clearTimeout(status);

        let now = Date.now();
        if(now - last < 30) {
          this.runImpl(last);
          return;
        }

        let idle = {
          last:last, now:now, time: (now - last)
        };

        result = this.mainloop(idle);
        if(result < 0) {
          return ;
        }

        this.runImpl(now);
      }, 20);
      return result;
    }

    protected mainloop(idle:any) : number {
      this._cache && this._cache.update();
      this._database && this._database.update();
      return 0;
    }

    protected onHTTPListening() {
        this.handleHTTPListening(this.http_server);
    }
    
    protected onHTTPSListening() {
        this.handleHTTPSListening(this.https_server);
    }

    protected onHTTPError(error:any) {
        this.handleHTTPError(this.http_server.server, error);
    }
    
    protected onHTTPSError(error:any) {
        this.handleHTTPError(this.https_server.server, error);
    }

    protected handleHTTPListening(server:http.Server) {
        let addr = server.address() as net.AddressInfo;
        let bind = addr.address + ":" + addr.port;
        this._logger?.info("(HTTP) Listening : " + bind);
    }

    protected handleHTTPSListening(server:https.Server) {
        let addr = server.address() as net.AddressInfo;
        let bind = addr.address + ":" + addr.port;
        this._logger?.info("(HTTPS) Listening : " + bind);
    }

    protected handleHTTPError(server:net.Server, error:any) {
        let addr = server.address() as net.AddressInfo;
        let bind = addr.address + ":" + addr.port;
    
        if (error.syscall != 'listen') {
          throw error;
        }
      
        // handle specific listen errors with friendly messages
        switch (error.code) {
          case 'EACCES':
            this._logger?.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
          case 'EADDRINUSE':
            this._logger?.error(bind + ' is already in use');
            process.exit(1);
            break;
          default:
            throw error;
        }
    }
};
