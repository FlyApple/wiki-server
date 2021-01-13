

import * as koa from "koa";

import * as base_parser from "./base"

import * as redis from "../redis/redis";

import mx from "../utils";
import * as settings_model from "../model/settings";

//
export namespace ServerSettings {

 
  // 验证初始化
  export function SettingsParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(!await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      // 是否登录都发送系统配置
      let result:any = null;
      let key:string = `SYSTEM_SETTINGS`;
      let cache:any = await redis.Cache_GetInstance();
      if(cache) {
        let value:boolean|any = await cache.get(key);
        if(value && (value = JSON.parse(value))) {
          result = value;
        }
      }
      
      if(!result || true) {
        result = await settings_model.ServerSettings.GetSettings();
        if (await ctx.check_result_failed(result)) {
          return ;
        }
        result.ip = ctx.remote.ip;

        if(cache) {
          cache.set(key, JSON.stringify(result), 24*60*60);
        }
      }
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, settings_model.ServerSettings.SettingsDataGetWithPublic(result));
    }
  }

}
