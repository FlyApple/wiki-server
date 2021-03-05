
import * as http from "http";
import * as koa from "koa";
import * as koa_router from "koa-router";

//
import * as parser_index from "../parsers/index";
import * as parser_settings from "../parsers/settings";
import * as parser_auth from "../parsers/auth";
import * as parser_user from "../parsers/user";
import * as parser_follow from "../parsers/follow";
import * as parser_notes from "../parsers/notes";

//
export namespace ServerParser {
  export declare interface Options {};
}

//
export let IndexParser = (router:koa_router, options?:any) => {
  router.get("/", parser_index.ServerParser.IndexParser(options));
}
export let AuthCodeParser = (router:koa_router, options?:any) => {
  router.get("/auth/code", parser_auth.ServerParser.AuthCodeParser(options));
}
export let SettingsParser = (router:koa_router, options?:any) => {
  router.get("/system/settings", parser_settings.ServerSettings.SettingsParser(options));
}

//
export let UserLoginParser = (router:koa_router, options?:any) => {
  //router.get("/user/login", parser_user.ServerParser.UserLoginParser(options));
  router.post("/user/login", parser_user.ServerParser.UserLoginParser(options));
}

export let UserRegisterParser = (router:koa_router, options?:any) => {
  //router.get("/user/register", parser_user.ServerParser.UserRegisterParser(options));
  router.post("/user/register", parser_user.ServerParser.UserRegisterParser(options));
}

//
export let AuthInitParser = (router:koa_router, options?:any) => {
  router.get("/auth/init", parser_auth.ServerParser.AuthInitParser(options));
}

export let UserLogoutParser = (router:koa_router, options?:any) => {
  router.get("/user/logout", parser_user.ServerParser.UserLogoutParser(options));
}

export let UserProfileEditingParser = (router:koa_router, options?:any) => {
  router.post("/user/profile/editing", parser_user.ServerParser.UserProfileEditingParser(options));
}

export let UserVerifyingParser = (router:koa_router, options?:any) => {
  router.get("/user/verifying", parser_user.ServerParser.UserVerifyingParser(options));
}

export let UserPublicDataParser = (router:koa_router, options?:any) => {
  router.get("/user/public/data", parser_user.ServerParser.UserPublicDataParser(options));
}

// Notes 
export let InitListNotesParser = (router:koa_router, options?:any) => {
  router.get("/notes/list", parser_notes.ServerParser.InitListNotesParser(options));
}
export let SendingNotesParser = (router:koa_router, options?:any) => {
  router.post("/notes/sending", parser_notes.ServerParser.SendingNotesParser(options));
}
export let SendingNotesCommitParser = (router:koa_router, options?:any) => {
  router.post("/notes/commit", parser_notes.ServerParser.SendingNotesCommitParser(options));
}
export let ReplyNotesCommitParser = (router:koa_router, options?:any) => {
  router.post("/notes/reply", parser_notes.ServerParser.ReplyNotesCommitParser(options));
}
export let ViewNoteItemParser = (router:koa_router, options?:any) => {
  router.post("/notes/viewitem", parser_notes.ServerParser.ViewNoteItemParser(options));
}
export let ViewNoteParser = (router:koa_router, options?:any) => {
  router.post("/notes/view", parser_notes.ServerParser.ViewNoteParser(options));
}
export let InitNoteCommitListParser = (router:koa_router, options?:any) => {
  router.get("/notes/commitlist", parser_notes.ServerParser.InitNoteCommitListParser(options));
}
export let InitNoteReplyCommitListParser = (router:koa_router, options?:any) => {
  router.get("/notes/replylist", parser_notes.ServerParser.InitNoteReplyCommitListParser(options));
}


//FOLLOW
export let FollowingMeParser = (router:koa_router, options?:any) => {
  router.get("/follow/following", parser_follow.ServerParser.FollowingParser(options));
}

export let FollowingCancelParser = (router:koa_router, options?:any) => {
  router.get("/follow/cancel", parser_follow.ServerParser.CancelParser(options));
}
