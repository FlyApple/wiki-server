

import * as http from "http";
import * as koa from "koa";

import mx from "../utils";
import * as base_parser from "./base";
import * as database from "../database/database";
import * as redis from "../redis/redis";
import * as settings_model from "../model/settings";
import * as user_model from "../model/user";

//
export namespace ServerParser {

  //
  let db = database.Database_GetInstance();

  
  // 用户登录
  export function UserLoginParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        await next();
        return ;
      }

      // 检测验证码是否有效
      let result:any = await user_model.ServerModel.Check_AuthCode(ctx);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      // 检测系统配置 - 是否允许登录
      let settings = await settings_model.ServerSettings.GetSettings();
      if (await ctx.check_result_failed(settings)) {
        return ;
      }
      if(settings.allow_signin < 1) {
        await ctx.send_json_result(200, null, mx.err.NewError(mx.err.ERRORCODE_STOPPING, mx.err.ERROR_STOPPING));
        return ;
      }

      // 0: MID, 1:Account name, 2:Phone number, 3: Email address
      let login_data:any = {
        type: ctx.body.type_index,
        user_nm: ctx.body.account,
        user_pw: ctx.body.hash_password,
        auth_code: ctx.body.auth_code,

        //
        ipaddress: ctx.remote.ip,
        device: ctx.remote.device,
      };

      //
      let user_data:any = {};
      result = await user_model.ServerModel.UserLogin(login_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      user_data = result;
      ctx.local_storage.set("mid", user_data.auth_data.user_nid, -1);
      ctx.local_storage.set("token_id", user_data.auth_data.auth_id, -1);
      ctx.local_storage.set("token_hash", user_data.auth_data.hash, -1);
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.UserDataGetWithPublic(user_data), null);    
    };
  }

  // 用户注册
  export function UserRegisterParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        await next();
        return ;
      }

      // 检测验证码是否有效
      let result:any = await user_model.ServerModel.Check_AuthCode(ctx);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      // 检测系统配置 - 是否允许注册
      let settings = await settings_model.ServerSettings.GetSettings();
      if (await ctx.check_result_failed(settings)) {
        return ;
      }
      if(settings.allow_signup < 1) {
        await ctx.send_json_result(200, null, mx.err.NewError(mx.err.ERRORCODE_STOPPING, mx.err.ERROR_STOPPING));
        return ;
      }

      //
      let signup_data:any = {
        type: ctx.body.type_index,
        user_nm: ctx.body.account_name,
        user_email: ctx.body.email,
        user_pw: ctx.body.hash_password,
        auth_code: ctx.body.auth_code,
        agree_policy: ctx.body.agree_policy,
        //
        ipaddress: ctx.remote.ip,
        device: ctx.remote.device,
      };


      //
      let user_data:any = {};
      result = await user_model.ServerModel.UserRegister(signup_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      user_data = result;
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.UserDataGetWithPublic(user_data), null);
    };
  }

  // 用户注销
  export function UserLogoutParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(!await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      //
      let user_data:any = {};
      let auth_data = ctx.server_options.auth_data;
      let result = await user_model.ServerModel.UserLogout(auth_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      user_data = result;
      delete user_data.auth_data.code;
      delete user_data.auth_data.hash;

      ctx.local_storage.set("mid", "", 0);
      ctx.local_storage.set("token_id", "", 0);
      ctx.local_storage.set("token_hash", "", 0);
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.UserDataGetWithPublic(user_data)); 
    };
  }

  // 用户认证:激活账号，邮箱认证，手机号认证（未完成）
  export function UserVerifyingParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      let retcode = await base_parser.ServerParser.BaseParser(ctx, options);

      // 检测验证码是否有效
      let result:any = await user_model.ServerModel.Check_AuthCode(ctx);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      // 
      let verifying_data = {
        type_index: ctx.query.type || 0,
        type_name: "",
        token_id: (ctx.query.token_id || "").trim(),
        token_hash: (ctx.query.token_hash || "").trim().toUpperCase(),
      };
      
      console.info(verifying_data);

      if(verifying_data.type_index == 0 || verifying_data.type_index == 1) {
        verifying_data.type_name = "verifying_email";

        // 处理邮箱认证，邮箱认证不需要用户必须登录
        // 
        result = await user_model.ServerModel.UserGetVerifyingData(verifying_data);
        if (await ctx.check_result_failed(result)) {
          return ;
        }

        let ret = await user_model.ServerModel.UserActivateAccount(result);
        if (await ctx.check_result_failed(ret)) {
          return ;
        }
      } else {
        // 验证是否已登录
        if(retcode < 0) {
          if(!await ctx.check_auth_data_failed(ctx.server_options)) {
            await next(); 
          }
          return ; 
        }

        //
        let auth_data = ctx.server_options.auth_data;
        
        // 判断是否是认证信息需要重新发送，必须登录后才能发送
        // 重新发送认证信息:
        if(verifying_data.type_index == 2) {
          verifying_data.type_name = "send_email";

          result = await user_model.ServerModel.UserSendVerifyingEmail(auth_data, verifying_data);
          if (await ctx.check_result_failed(result)) {
            return ;
          }

        } else {
          await ctx.send_json_result(200, new database.Database.DBError(-1, "Unknow Error"));
          return ;
        }
      }

      console.info(result);

 
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.VerifyingDataGetWithPublic(result)); 
    };
  }

  //
  export function UserPublicDataParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(! await ctx.check_auth_data_failed(ctx.server_options)) {
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

      // 
      let public_data = {
        user_nid: (ctx.query.mid || "").trim(),
      };

      // 
      let result:any = await user_model.ServerModel.UserPublicData(auth_data, public_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.UserDataGetWithPublicAny(result)); 
    };
  }

  // 用户属性修改
  export function UserProfileEditingParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(!await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      //
      let user_data:any = {};
      let auth_data = ctx.server_options.auth_data;
      let profile_data:any = { ...ctx.body };
      profile_data.user_nid = profile_data.mid.trim();
      delete profile_data.mid;

      let result = await user_model.ServerModel.ProfileEditing(auth_data, profile_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      user_data = result;
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, user_model.ServerModel.UserDataGetWithPublic(user_data), null);    
    };
  }

}