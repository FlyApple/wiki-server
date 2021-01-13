//
import * as path from "path";
import * as fs from "fs";
import * as net from "net";

//
export default abstract class RouteBase<T> {
    // 
    protected development: boolean = false;
    protected root: string = "./";
    protected secure: boolean;
    protected server: net.Server;
    protected app: T;

    // 
    constructor(server:net.Server, app:T, secure: boolean = false) {
        this.server = server;
        this.app = app;
        this.secure = secure;
    }

    init(root:string = "./", mode:string = "production") : boolean {
        if(mode != "production") {
            this.development = true;
        }

        this.root = root.trim();
        if(!this.root.endsWith("/")) {
            this.root = this.root + "/";
        }
        
        return true;
    }

    abstract onInit() : void;
    abstract onInitRouter() : void;
};
