

import * as koa from "koa";
import * as captcha from "svg-captcha";

import * as base_parser from "./base"
import * as database from "../database/database";

import * as redis from "../redis/redis";

import * as mx_crypto from "../utils/crypto";
import mx from "../utils";
import * as user_model from "../model/user";
import * as notes_model from "../model/notes";

//
export namespace ServerParser {

 
  // 发送NOTE
  export function SendingNotesParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(! await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(await ctx.check_auth_data_permission(auth_data) < 2 || auth_data.privilege_allow_notes < 1) {
        await ctx.send_json_result(200, null, new database.Database.DBError(mx.err.ERRORCODE_OPERATION_NOT_PERMISSION, mx.err.ERROR_OPERATION_NOT_PERMISSION));
        return ;
      }


      //
      let note_data:any = {
        //
        uuid: ctx.body.uuid || "",
        content: ctx.body.content || "",
        tags: ctx.body.tags || "",
        source_length: ctx.body.source_length || 0,
        crypto_level: ctx.body.crypto_level || 0,
        crypto_length: ctx.body.crypto_length || 0,
        recving_time: mx.timestampS(),
        sending_time: ctx.body.time || mx.timestampS(),
        private_level: ctx.body.private_level || 0,

        //
        ipaddress: ctx.remote.ip,
        device: ctx.remote.device,
      };

      note_data.uuid = note_data.uuid.trim();
      note_data.content = note_data.content.trim();
      note_data.tags = note_data.tags.trim();

      // 发送 NOTE
      let result:any = await notes_model.ServerParser.SendingNote(auth_data, note_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.NoteDataGetWithPublic(result));
    }
  }

  // 发送NOTE COMMIT
  export function SendingNotesCommitParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(! await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(await ctx.check_auth_data_permission(auth_data) < 2 || auth_data.privilege_allow_notes < 1) {
        await ctx.send_json_result(200, null, new database.Database.DBError(mx.err.ERRORCODE_OPERATION_NOT_PERMISSION, mx.err.ERROR_OPERATION_NOT_PERMISSION));
        return ;
      }


      //
      let commit_data:any = {
        //
        note_uid: ctx.body.note_uid || 0,
        note_nid: (ctx.body.note_nid || "").trim(),
        note_uuid: (ctx.body.note_uuid || "").trim(),

        //
        uuid: (ctx.body.uuid || "").trim(),
        content: (ctx.body.content || "").trim(),
        source_length: ctx.body.source_length || 0,
        crypto_level: ctx.body.crypto_level || 0,
        crypto_length: ctx.body.crypto_length || 0,
        recving_time: mx.timestampS(),
        sending_time: ctx.body.time || mx.timestampS(),
        private_level: ctx.body.private_level || 0,

        //
        ipaddress: ctx.remote.ip,
        device: ctx.remote.device,
      };

      // 发送 NOTE
      let result:any = await notes_model.ServerParser.SendingCommit(auth_data, commit_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.CommitDataGetWithPublic(result));
    }
  }


  // 发送NOTE REPLY COMMIT
  export function ReplyNotesCommitParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(! await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(await ctx.check_auth_data_permission(auth_data) < 2 || auth_data.privilege_allow_notes < 1) {
        await ctx.send_json_result(200, null, new database.Database.DBError(mx.err.ERRORCODE_OPERATION_NOT_PERMISSION, mx.err.ERROR_OPERATION_NOT_PERMISSION));
        return ;
      }


      //
      let reply_commit_data:any = {
        //
        note_uid: ctx.body.note_uid || 0,
        note_nid: (ctx.body.note_nid || "").trim(),
        note_uuid: (ctx.body.note_uuid || "").trim(),
        //
        commit_uid: ctx.body.commit_uid || 0,
        commit_nid: (ctx.body.commit_nid || "").trim(),
        commit_uuid: (ctx.body.commit_uuid || "").trim(),
        //
        replyto_uid: ctx.body.replyto_uid || 0,
        replyto_nid: (ctx.body.replyto_nid || "").trim(),
        replyto_uuid: (ctx.body.replyto_uuid || "").trim(),
        //
        uuid: (ctx.body.uuid || "").trim(),
        content: (ctx.body.content || "").trim(),
        source_length: ctx.body.source_length || 0,
        crypto_level: ctx.body.crypto_level || 0,
        crypto_length: ctx.body.crypto_length || 0,
        recving_time: mx.timestampS(),
        sending_time: ctx.body.time || mx.timestampS(),
        private_level: ctx.body.private_level || 0,

        //
        ipaddress: ctx.remote.ip,
        device: ctx.remote.device,
      };

      // 发送 NOTE
      let result:any = await notes_model.ServerParser.ReplyCommit(auth_data, reply_commit_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.CommitDataGetWithPublic(result));
    }
  }

  export function InitListNotesParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
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

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(!auth_data || await ctx.check_auth_data_permission(auth_data) < 2) {
        auth_data = undefined;
      }

      let last_data = {
        page: ctx.query.page || 0,
        uid: ctx.query.last_uid || 0,
        nid: (ctx.query.last_nid || "").trim(),
      };

      // 发送 NOTES 列表
      let result:any = await notes_model.ServerParser.InitNoteList(auth_data, last_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.InitNoteListDataGetWithPublic(result));
    }
  }

  export function ViewNoteItemParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(! await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      //
      let item_data = {
        uid: ctx.query.note_uid || 0,
        nid: (ctx.query.note_nid || "").trim(),
      };
      // 检测长度和必要格式，防止被注入
      if(/^[\d]{4,12}$/g.test(item_data.uid) == false || /^[0-9a-zA-Z]{6,32}$/g.test(item_data.nid) == false) {
        return await ctx.send_json_result(200, null, new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL));
      }

      // 强制校验登录状态
      let ret = await base_parser.ServerParser.AuthCheck(ctx, true);
      if(!ret) {
        ctx.server_options.auth_data = undefined;
      }

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(!auth_data || await ctx.check_auth_data_permission(auth_data) < 2) {
        auth_data = undefined;
      }

      // let cache = await redis.Cache_GetInstance();
      // if(cache && ctx.remote.device_idx) {
      //   let value:boolean|any = await cache.get(`note_${item_data.nid}`);
      // }

      // 
      let result:any = await notes_model.ServerParser.ViewNoteItem(auth_data, item_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.NoteDataGetWithPublic(result));
    }
  }

  export function ViewNoteParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        if(! await ctx.check_auth_data_failed(ctx.server_options)) {
          await next(); 
        }
        return ; 
      }

      //
      let note_data = {
        uid: ctx.query.note_uid || 0,
        nid: (ctx.query.note_nid || "").trim(),
      };

      // 检测长度和必要格式，防止被注入
      if(/^[\d]{4,12}$/g.test(note_data.uid) == false || /^[0-9a-zA-Z]{6,32}$/g.test(note_data.nid) == false) {
        return await ctx.send_json_result(200, null, new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL));
      }

      // 强制校验登录状态
      let ret = await base_parser.ServerParser.AuthCheck(ctx, true);
      if(!ret) {
        ctx.server_options.auth_data = undefined;
      }

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(!auth_data || await ctx.check_auth_data_permission(auth_data) < 2) {
        auth_data = undefined;
      }

      // let cache = await redis.Cache_GetInstance();
      // if(cache && ctx.remote.device_idx) {
      //   let value:boolean|any = await cache.get(`note_${note_data.nid}`);
      // }

      // 
      let result:any = await notes_model.ServerParser.ViewNote(auth_data, note_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.NoteDataGetWithPublic(result));
    }
  }

  
  export function InitNoteCommitListParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
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

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(!auth_data || await ctx.check_auth_data_permission(auth_data) < 2) {
        auth_data = undefined;
      }

      let last_data = {
        page: ctx.query.page || 0,
        //NOTEUID,NID
        note_uid: ctx.query.note_uid || 0,
        note_nid: (ctx.query.note_nid || "").trim(),
        //评论UID,NID
        uid: ctx.query.last_uid || 0,
        nid: (ctx.query.last_nid || "").trim(),
      };

      // 发送 NOTES 列表
      let result:any = await notes_model.ServerParser.InitCommitList(auth_data, last_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.InitCommitListDataGetWithPublic(result));
    }
  }

  export function InitNoteReplyCommitListParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
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

      // 校验权限
      let auth_data = ctx.server_options.auth_data;
      if(!auth_data || await ctx.check_auth_data_permission(auth_data) < 2) {
        auth_data = undefined;
      }

      let last_data = {
        page: ctx.query.page || 0,
        expand: ctx.query.expand || 0,
        //NOTEUID,NID
        note_uid: ctx.query.note_uid || 0,
        note_nid: (ctx.query.note_nid || "").trim(),
        //评论UID,NID
        commit_uid: ctx.query.commit_uid || 0,
        commit_nid: (ctx.query.commit_nid || "").trim(),
        //回复UID,NID
        uid: ctx.query.last_uid || 0,
        nid: (ctx.query.last_nid || "").trim(),
      };

      // 发送 NOTES 列表
      let result:any = await notes_model.ServerParser.InitReplyCommitList(auth_data, last_data);
      if (await ctx.check_result_failed(result)) {
        return ;
      }

      //
      await ctx.send_json_code_result(200, mx.defs.S_SUCCESS, notes_model.ServerParser.InitReplyCommitListDataGetWithPublic(result));
    }
  }
}
