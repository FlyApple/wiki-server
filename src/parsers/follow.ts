

import * as koa from "koa";

import * as base_parser from "./base"

import * as redis from "../redis/redis";

import mx from "../utils";
import * as follow_model from "../model/follow";

//
export namespace ServerParser {

 
  // 关注（必须登录）
  export function FollowingParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(!await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      let auth_data = ctx.server_options.auth_data;

      // 
      let follow_data = {
        user_nid: (ctx.query.mid || "").trim(),
        following_user_nid: (ctx.query.following_mid || "").trim(),
      };

      // 
      let result:any = await follow_model.ServerModel.Following(auth_data, follow_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, follow_model.ServerModel.FollowDataGetWithPublic(result)); 
    }
  }

  // 取消关注（必须登录）
  export function CancelParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(!await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      let auth_data = ctx.server_options.auth_data;

      // 
      let follow_data = {
        user_nid: (ctx.query.mid || "").trim(),
        following_user_nid: (ctx.query.following_mid || "").trim(),
      };

      // 
      let result:any = await follow_model.ServerModel.Cancel(auth_data, follow_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, follow_model.ServerModel.FollowDataGetWithPublic(result)); 
    }
  }

}
