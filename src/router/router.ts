
//
import * as path from "path";
import * as fs from "fs";
import * as net from "net";

import * as koa from "koa";
import * as koa_router from "koa-router";
import * as koa_logger from "koa-logger";
import * as koa_static from "koa-static";
import * as koa_bodyparser from "koa-bodyparser";
import * as koa_cookieparser from "koa-cookie-parser";
import * as koa_views from "koa-views";
import * as koa_session from "koa-session";

//
import config from "../config/index"
import RouterBase from "./routerbase";

//
import mx from "../utils/index"
import * as cookies from "../utils/cookies"
import * as server_parser from "../middle/index";


//
let _logroot_path:string| undefined = undefined;
async function  _logroot_make(path:string) : Promise<fs.Stats| boolean>{
    if(path == null || path == undefined) {
        return false;
    }
    return new Promise((resolve, reject) => {
        let stat = fs.stat(path, (err, stat) => {
            if(stat && stat.isDirectory()) {
                resolve(stat); 
                return ;
            }
            
            // 语法检测无法通过
            fs.mkdir(path, { recursive: true, mode:0o777 }, (err) => {
                if(err) {
                    resolve(false);
                    return ;
                }
                stat = fs.statSync(path);
                resolve(stat); 
            });
        });
    });
}
function _lognow_date() {
    let date = new Date();
    return date.getFullYear() + 
        (date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1) + 
        (date.getDate() < 10 ? "0" : "") + date.getDate();
}

//
export default class Router extends RouterBase<koa> {

    protected _logstream_access;

    protected _router:any = null;

    protected _name:string = "";
    protected _signed_key:string = "";
    protected _encrypt_level:number = 0;

    constructor(server:net.Server, app:koa, secure: boolean = false) {
        super(server, app, secure);
    }

    init(root:string = "./", mode:string = "production") : boolean {
        if(!super.init(root, mode)) {
            return false;
        }
        
        //
        this._name = (config.server_codename || `${config.server_name}_${config.server_code}`).toLowerCase();
        this._signed_key = config.signed_key;

        //
        if(_logroot_path == undefined) {
            _logroot_path = path.join(this.root,"log");
        }

        _logroot_make(_logroot_path);
        this._logstream_access = fs.createWriteStream(path.join(_logroot_path, "access_" + _lognow_date() +".log"), 
        {
            flags: 'a', encoding: 'utf8',
        });

        //
        this.onInit();
        return true;
    }

    onInit() : void {
        //
        this._router = new koa_router();

        // 
        this.app.use(koa_logger({
            transporter: (str, args) => {
                let date = new Date();
                let prefix = date.getFullYear() + "-" + (date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1) + "-" + (date.getDate() < 10 ? "0" : "") + date.getDate();
                prefix = prefix + " " + (date.getHours() < 10 ? "0" : "") + date.getHours() + ":" 
                        + (date.getMinutes() < 10 ? "0" : "") + date.getMinutes() + ":" 
                        + (date.getSeconds() < 10 ? "0" : "") + date.getSeconds();
                let txt = (!this.secure ? "(HTTP)" : "(HTTPS)") +
                          " " + (args[3] == undefined ? " -->" : " <--") + " " + args[1] + " " + args[2] + 
                          " " + (args[3] == undefined ? "" : "("+ args[3] + ")") + 
                          " " + (args[4] == undefined ? "" : args[4]) + " " + (args[5] || "");
                process.stdout.write(`[${prefix}] ${txt}\n`);

                if(this._logstream_access) {
                    this._logstream_access.write(`[${prefix}] ${txt}\n`);
                }
            }
        }));

        //
        this.app.use(koa_views(path.join(this.root, "views"), {
            extension:"ejs"
        }));

        //
        this.app.use(koa_static(path.join(this.root, "public")));

        this.app.use(koa_bodyparser({
            jsonLimit:"1mb",
            textLimit:"1mb",
        }));

        this.app.use(koa_cookieparser({
            cookieNameList:[],
        }));

        if(this._signed_key && this._signed_key.length > 0) {
            this.app.keys = [this._signed_key];
        }
        
        let session_options = {
            key: `mx_${this._name}`,
            //maxAge: 24*60*60*1000, //默认1天过期
            overwrite: true,
            httpOnly: true,
            signed: true,
            rolling: false,
            renew: false
        };
        this.app.use(koa_session(session_options, this.app));

        this.app.use( async (ctx, next) => {
            //
            ctx.local_storage = this.getLocalStorage(ctx);

            // the parsed body will store in ctx.request.body
            // if nothing was parsed, body will be an empty object {}
            if(ctx.request.rawBody) {
                let raw_body = !ctx.request.rawBody || ctx.request.rawBody.toLowerCase() == "undefined" || ctx.request.rawBody.toLowerCase() == "null" ? 
                                undefined : ctx.request.rawBody;
                if(raw_body && this._encrypt_level == 0) {
                    // URI 解码
                    let raw_data = decodeURIComponent(raw_body);
                    if(raw_data) {
                        // 解析必须带有转义
                        ctx.body = JSON.parse(raw_data);
                    }
                }
            }

            if(!ctx.body) {
                ctx.body = ctx.request.body;
            }

            await next();
        });

        //
        this.app.use(async (ctx, next) => {
            
            if(this.development) { //开发模式，新增跨域域名
                ctx.response.set('Access-Control-Allow-Origin',  '*');
                if(ctx.request.header.origin) {
                    ctx.response.set('Access-Control-Allow-Origin', ctx.request.header.origin);
                }
            } else if(config.allow_domains && config.allow_domains.length > 0){
                let pos = config.allow_domains.indexOf(ctx.request.header.origin as string);
                if(pos >= 0) {
                    ctx.response.set('Access-Control-Allow-Origin', config.allow_domains[pos]);
                }
            }
            ctx.response.set('Access-Control-Allow-Headers', 'content-type,cache-control');
            ctx.response.set('Access-Control-Allow-Methods', 'PUT,POST,GET,DELETE,OPTIONS');
            ctx.response.set('Access-Control-Allow-Credentials', 'true');
            if(ctx.method.toLocaleLowerCase() == 'options') {
                ctx.response.status = 204;
                ctx.response.body = {};
                return ;
            } else {
                await next();
            }
        });

        //
        this.onInitRouter();

        //
        this.app.use(this._router.routes());
        this.app.use(this._router.allowedMethods());

        // error handler
        this.app.use(async (ctx, next) => {
            let locals:any = {};

            try {
                await next();
            } catch (err) {
                locals.status = err.status || err.statusCode || 500;
                locals.message = err.message;
                locals.error = this.development ? err : {};
                
                ctx.status = locals.status;
                await ctx.render("error", locals);
            }
        });

        // catch 404 and forward to error handler
        this.app.use( async (ctx, next) => {
            await ctx.throw(404, Error("Not Found"));
        });
    }

    getLocalStorage(ctx:koa.ParameterizedContext) : any {
        let local_crypto_key:string | undefined = undefined;
        if(this.app.keys && this.app.keys instanceof Array && this.app.keys.length > 0) {
            local_crypto_key = this.app.keys[0];
        }
        let local_root_ns = `mx_${this._name}_root`;
        let local_root = new cookies.mx.Cookies(local_root_ns, ctx.cookies, local_crypto_key);
        
        return {
            name: local_root_ns,
            get: (key) => {
                return local_root.get(key);
            },
            set: (key, value, ms = 60 * 1000) => {
                local_root.set(key, value, ms);
            }
        };
    }

    onInitRouter() : void {
        // 
        server_parser.IndexParser(this._router);

    }
};
