
import * as http from "http";
import * as koa from "koa";

import * as base_parser from "./base"

//
export namespace ServerParser {

  export function IndexParser(options?:base_parser.ServerParser.Options) : koa.Middleware {
    return async (ctx, next) => {
      if(await base_parser.ServerParser.BaseParser(ctx, options) < 0) {
        await next();
        return ;
      }
      
      //
      await ctx.render("index", { 
        title: "Server Working",
        utctime: (new Date()).toUTCString(),
        localtime: (new Date()).toString(),
        remote_address: ctx.remote.ips.join(","),
        remote_sysinfo: ctx.remote.user_agent.os.name + " (" + ctx.remote.user_agent.os.arch + ")" + ", "
        + ctx.remote.user_agent.browser.name + " " + ctx.remote.user_agent.browser.version + ""
      });
    };
  }
}
