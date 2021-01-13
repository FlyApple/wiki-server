
import * as koa from "koa";

import mx from "../utils/index";
import * as mx_crypto from "../utils/crypto";
import * as mx_user_agent from "../utils/user_agent";
import * as database from "../database/database";
import * as user_model from "../model/user";

//
namespace Application {
    interface Context {
        server_options:any;
        remote:any;

        //
        send_json(status:number, result?:any) : Promise<void>;
        send_json_result(status:number, result?:any, error?:Error) : Promise<void>;
        send_json_code_result(status:number, code:number, result?:any) : Promise<void>;
        send_svg_image(result?:any) : Promise<void>;

        //
        check_result_failed(result?:any) : Promise<boolean>;
        check_auth_data_failed(result?:any) : Promise<boolean>;
        check_auth_data_permission(result?:any) : Promise<number>;
    }
};

export namespace ServerParser {
    let db = database.Database_GetInstance();

    export const TYPE_SERVER:string = "server";
    export const TYPE_MANAGE:string = "manage";   
    export interface Options {
        type:string; //"server", "manage" 改项解析是否区分公开或后台管理
        auth:boolean; //是否验证， 默认否
        auth_result:number; //0是默认值， 1是验证成功
        auth_data?:any;
    }

    export function InitParser(ctx:any, options?:ServerParser.Options) : boolean {
        //
        if(options == null || options == undefined) {
            options = { 
                type: ServerParser.TYPE_SERVER,
                auth: false,
                auth_result: 0
            }
        }

        ctx.server_options = options;
        ctx.send_json = async (status, result) => { 
            ctx.status = status;
            ctx.type = "json";
            ctx.response.body = "";
            if(result == undefined || result == null) {
                // nothing
            } else if(result instanceof String) {
                ctx.response.body = result;
            } else if (result instanceof Array || result instanceof Object) {
                ctx.response.body = JSON.stringify(result);
            } else {
                ctx.response.type = "application/json";
            }
        };
        ctx.send_json_result = async (status, result, error) => { 
            let text = {
                status: status,
                code: 0,
                level: 0,
                data: result,
                message: "",
                error: null,
                success: true,
            };

            if(error != null) {
                text.success = false;
                text.code = error.code || mx.err.ERRORCODE_UNKNOW;
                text.message = error.message || mx.err.ERROR_UNKNOW;
                text.error = error;
                text.data = null;
            }
            await ctx.send_json(status, text);
        }
        ctx.send_json_code_result = async (status, code, result) => {
            let text = {
                status: status,
                code: code,
                level: 0,
                data: result,
                message: "",
                error: null,
                success: true,
            };

            if(code < 0) {
                text.success = false;
            }
            await ctx.send_json(status, text);
        }
        ctx.send_svg_image = async (result) => { 
            ctx.status = 200;
            ctx.type = "svg";
            ctx.response.type = "image/svg+xml";
            ctx.response.body = result;
        };

        ctx.check_result_failed = async (result) => { 
            if(result == false) {
                await ctx.send_json_result(200, null, new database.Database.DBError(-1, "Unknow Error"));
                return true;
            } else if(result instanceof Error || result instanceof database.Database.DBError) {
                await ctx.send_json_result(200, null, result);
                return true;
            }
            return false;
        };

        ctx.check_auth_data_failed = async (result) => { 
            if(!result) {
                await ctx.send_json_result(200, null, new database.Database.DBError(-1, "Unknow Error"));
                return true;
            } else if(result.auth_data instanceof Error || result.auth_data instanceof database.Database.DBError) {
                await ctx.send_json_result(200, null, result);
                return true;
            }
            return false;
        };

        ctx.check_auth_data_permission = async (result) => {  
            let auth_result = ctx.server_options.auth_result;
            if(result == undefined || auth_result == undefined) {
                return -1;
            }

            if(auth_result < 0) {
                return auth_result;
            }
            
            if(auth_result >= 2 && result.activated > 0 && result.user_privilege_level >= mx.defs.PRIVILEGE_LEVEL_USER) {
                return 2;
            }
            if(auth_result >= 1) {
                return 1;
            }
            return 0;
        }

        //
        ctx.remote = {
            ip: undefined,
            ips: [],
            device: undefined,
            device_idx: undefined, //存入COOKIE, COOKIE改变将发生变化
            session_idx: undefined,
            user_agent: undefined,
            // 
            token: undefined
        };

        ServerParser.LoadRemoteUserAgent(ctx);

        //
        return true;
    }

    export function InitRemoteAddress(ctx:any) : void {

        if (ctx.request.ips) {
            ctx.remote.ips = ctx.request.ips;
            if (ctx.request.ips.length > 0) {
                ctx.remote.ip = ctx.request.ips[0];
            }
        }
        if (!ctx.remote.ip && ctx.request.ip) {
            ctx.remote.ip = ctx.request.ip;
        }
        if (!ctx.remote.ip && ctx.req.connection.remoteAddress) {
            ctx.remote.ip = ctx.req.connection.remoteAddress;
        }
        if (!ctx.remote.ip && ctx.req.socket.remoteAddress) {
            ctx.remote.ip = ctx.req.socket.remoteAddress;
        }
        if (!ctx.remote.ip) {
            ctx.remote.ip = "0.0.0.0";
        }
        if(ctx.remote.ips.length == 0) {
            ctx.remote.ips.push(ctx.remote.ip);
        }
    }

    export function InitRemoteSession(ctx:any) : void {
        if(!ctx.session) {
            return ;
        }

        let idx = ctx.local_storage.get("device_idx");
        if(!idx)
        {
            idx = mx_crypto.mx.sha1HashString(`${ctx.remote.ip}-${ctx.remote.device}-${mx.timestampS()}`);
            idx = mx_crypto.mx.md5HashString(`${idx}${mx.generateRandom(10000, 99999)}`);
            ctx.local_storage.set("device_idx", idx, -1);
        }
        ctx.remote.device_idx = idx;

        // token data
        let token_id = ctx.request.query.token_id;
        let token_hash = ctx.request.query.token_hash;
        if(!token_id || !token_id) {
            token_id = ctx.local_storage.get("token_id");
            token_hash = ctx.local_storage.get("token_hash");
        }

        if(token_id && token_hash) {
            ctx.remote.token = {
                id:token_id.trim(),
                hash:token_hash.trim()
            }
        }

        if(!ctx.session.idx) {
            idx = mx_crypto.mx.sha1HashString(`${ctx.remote.ip}-${mx.timestampS()}`);
            idx = mx_crypto.mx.md5HashString(`${idx}${mx.generateRandom(10000, 99999)}`);
            ctx.session.idx = idx;
        } 
        ctx.remote.session_idx = ctx.session.idx;
    }

    export function LoadRemoteUserAgent(ctx:any) : boolean {
        ctx.remote.user_agent = mx_user_agent.mx.UserAgent.parse(ctx.request.headers['user-agent']);
        ctx.remote.device = `${ctx.remote.user_agent.os.name}, ${ctx.remote.user_agent.browser.name} ${ctx.remote.user_agent.browser.version}`;

        ServerParser.InitRemoteAddress(ctx);
        ServerParser.InitRemoteSession(ctx);

        console.info(ctx.remote.ips, ctx.remote.device, ctx.remote.device_idx, ctx.remote.session_idx, ctx.remote.token);
        return true;
    }

    export async function AuthCheck(ctx:any, manual:boolean = false) : Promise<boolean> {
        if(ctx.server_options == null || ctx.server_options == undefined) {
            return true;
        }

        ctx.server_options.auth_result = 0;
        ctx.server_options.auth_data = undefined;
        if(!manual) {
            if(ctx.server_options.auth == undefined || ctx.server_options.auth == false) {
                return true;
            }
        }

        if (!await user_model.ServerModel.UserAuthToken(ctx.remote.token, ctx.remote, ctx.server_options)) {
            if(ctx.server_options.auth_data) {
                // 如果拒绝访问，按错误处理
                if(ctx.server_options.auth_result == mx.err.ERRORCODE_ACCESS_DENIED) {
                    //               
                } else {
                    // 打印除了过期token外，所有错误
                    if(ctx.server_options.auth_result != mx.err.ERRORCODE_ACCESS_EXPIRED) {
                        console.log(`[${mx.datetimeFormat(null)}] [Auth] Error (IP:${ctx.remote.ip}) (TOKEN: ${ctx.remote.token.id} ${ctx.remote.token.hash}) ${ctx.server_options.auth_data}`);
                    }
                    ctx.server_options.auth_data = undefined;
                }
                
            }
            return false;
        }
        return true;
    }

    export async function BaseParser(ctx:any, options?:ServerParser.Options) : Promise<number> {
        if(!ServerParser.InitParser(ctx, options)) {
            return -1;
        }
          
        if(!await ServerParser.AuthCheck(ctx)) {
            console.info(ctx.server_options);
            return -2;
        }

        return 0;
    }
};

