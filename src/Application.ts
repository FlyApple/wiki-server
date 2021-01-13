
//
import * as fs from "fs";

import * as net from "net";

import * as http from "http";
import * as https from "https";
import * as koa from "koa";

import * as redis from "./redis/redis";

import singleton from "./utils/singleton";

import config from "./config/index";
import RouterServer from "./router/routerserver";
import mx from "./utils";
import * as perform from "./utils/performance";

//
export default class Application extends singleton<Application> {
    private _root:string = "./";
    private _mode:"development"|"production"  = "production";

    private http_server:any;
    private https_server:any;
    private http_router:any;
    private https_router:any;

    constructor() {
        super();

        this._root = process.cwd();
        this._mode = process.env.NODE_ENV == "development" ? "development" : "production";
    }

    init() : boolean {
        //
        console.info("Mode : " + (this._mode == "development" ? "(development)" : "(production)"));
        console.info("Work Root : " + this._root);

        //
        let cache = redis.Cache_GetInstance(2, config.redis);
        if(!cache) {
          return false;
        }
        
        if (!this.initServer()) {
          return false;
        }

        return true;
    }

    initServer() : boolean {
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
        return true;
    }

    run() : number {
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

        //
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
        console.info("(HTTP) Listening : " + bind);
    }

    protected handleHTTPSListening(server:https.Server) {
        let addr = server.address() as net.AddressInfo;
        let bind = addr.address + ":" + addr.port;
        console.info("(HTTPS) Listening : " + bind);
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
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
          case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
          default:
            throw error;
        }
    }
};
