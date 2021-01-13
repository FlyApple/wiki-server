

import * as koa from "koa";
import * as captcha from "svg-captcha";

import * as base_parser from "./base"

import * as redis from "../redis/redis";

import * as mx_crypto from "../utils/crypto";
import mx from "../utils";
import * as user_model from "../model/user";

//
export namespace ServerParser {

 
  // 验证初始化
  export function AuthInitParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(!await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      // 强制校验登录状态
      let ret = await base_parser.ServerParser.AuthCheck(ctx, true);
      if(!ret) {
        ctx.server_options.auth_data = undefined;
      }

      let auth_data = ctx.server_options.auth_data;
      if(!auth_data) {
        await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, null);
        return ;
      }
      
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.AuthDataGetWithPublic(auth_data));
    }
  }

  // 发送svg验证码图片
  export function AuthCodeParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        await next();
        return ;
      }

      let cache = await redis.Cache_GetInstance();
      if(!cache|| !ctx.remote.device_idx) {
        await ctx.send_json_result(200, null, new Error("Unknow Error"));
        return ;
      }
      
      // 由于8和3接近,增加AHXM
      // let chars = "1234567890";
      let chars = "124567890AHXM";
      let code = captcha.create({
        size: 6, charPreset: chars, width:100, height: 36,
        noise: 2, background: "#333366", fontSize:30
      })

      let auth_key = `AUTH_CODE_${ctx.remote.device_idx}`;
      let auth_value:boolean|any = await cache.get(auth_key);
      if(auth_value && (auth_value = JSON.parse(auth_value)) && (auth_value.time + 3000) > mx.timestampMS()) {
        await ctx.send_json_result(200, null, new Error("Try again later"));
        return ;
      } else if(auth_value == null || auth_value.time > 0) {
        cache.set(auth_key, JSON.stringify({ time:mx.timestampMS(), value: code.text.toUpperCase() }), 1*60);
      } else {
        await ctx.send_json_result(200, null, new Error("Unknow Error"));
        return ;
      }

      //
      ctx.send_svg_image(code.data);
    };
  }
}
