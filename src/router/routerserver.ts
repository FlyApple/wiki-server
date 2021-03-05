
//
import * as net from "net";

import * as koa from "koa";

//
import Router from './router';

//
import * as server_parser from "../middle/index";

//
export default class RouterServer extends Router {

    constructor(server:net.Server, app:koa, secure: boolean = false) {
        super(server, app, secure);
    }
  
    init(root:string = "./", mode:string = "production") : boolean {
        if(!super.init(root, mode)) {
            return false;
        }
        return true;
    }

    onInitRouter() : void {
        super.onInitRouter();

        //
        server_parser.AuthCodeParser(this._router);
        server_parser.SettingsParser(this._router);
        
        //
        server_parser.UserLoginParser(this._router);
        server_parser.UserRegisterParser(this._router);

        //
        server_parser.AuthInitParser(this._router);
        server_parser.UserLogoutParser(this._router, {auth: true});
        server_parser.UserVerifyingParser(this._router, {auth: true});
        server_parser.UserPublicDataParser(this._router);
        server_parser.UserProfileEditingParser(this._router, {auth: true});

        // Notes
        server_parser.InitListNotesParser(this._router);
        server_parser.SendingNotesParser(this._router, {auth: true});
        server_parser.SendingNotesCommitParser(this._router, {auth: true});
        server_parser.ReplyNotesCommitParser(this._router, {auth: true});
        server_parser.ViewNoteParser(this._router);
        server_parser.ViewNoteItemParser(this._router);
        server_parser.InitNoteCommitListParser(this._router);
        server_parser.InitNoteReplyCommitListParser(this._router);

        // FOLLOW
        server_parser.FollowingMeParser(this._router, {auth: true});
        server_parser.FollowingCancelParser(this._router, {auth: true});
    }
};
