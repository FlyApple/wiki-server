import * as fs from "fs";
import * as os from "os";
import * as path from "path";


import {Singleton} from "./singleton";


//
export interface ILoggerItem {
    name: string;
    level: number;
    only: number;
    out_print:boolean;
    out_file:boolean;
}

export interface LoggerContent {
    level: number;
    name?: string;
    time: number;
    value: string;
}

export class LoggerItem implements ILoggerItem {
    public name: string = "";
    public level: number = Logger.LEVEL_ALL;
    public only: number = 0;
    public out_print: boolean = true;
    public out_file: boolean = false;

    private _path: string = "./";

    constructor(options?:any) {
        if(options) {
            this.name = options.name || "info";
            this.level = options.level || Logger.LEVEL_ALL;
            this.only = options.only ? 1 : 0;
            this.out_print = options.out_print == undefined ? true : options.out_print;
            this.out_file = options.out_file == undefined ? false : options.out_file;
            this._path = options.path || "./";
        }
    }

    public now_date() {
        let date = new Date();
        return date.getFullYear() + 
            (date.getMonth() + 1 < 10 ? "0" : "") + (date.getMonth() + 1) + 
            (date.getDate() < 10 ? "0" : "") + date.getDate();
    }

    public now_time(ms:number) {
        let date = new Date(ms);
        return `${date.getHours() < 10?"0":""}${date.getHours()}:${date.getMinutes() < 10?"0":""}${date.getHours()}:${date.getSeconds() < 10?"0":""}${date.getSeconds()}`;
    }

    public logout(log:LoggerContent) {
        if(this.level == Logger.LEVEL_ALL) {
        } else if(this.level < log.level) {
        } else {
            return ;
        }

        let value = "";
        if (log.level == Logger.LEVEL_ERROR) {
            value = `[ERROR - ${this.name.toUpperCase()}] ${log.value}`;
        } else if (log.level == Logger.LEVEL_WARN) { 
            value = `[WARN - ${this.name.toUpperCase()}] ${log.value}`;
        } else if (log.level == Logger.LEVEL_EXCEPT) { 
            value = `[EXCEPT - ${this.name.toUpperCase()}] ${log.value}`; 
        } else {
            value = `[INFO - ${this.name.toUpperCase()}] ${log.value}`;
        }

        if(this.out_print) {
            this.logout_print_impl(value);
        }

        if(this.out_file) {
            value = `${this.now_time(log.time)} ${value}`;
            this.logout_file_impl(value);
        }
    }

    private logout_print_impl(value) {
        if(this.level == Logger.LEVEL_EXCEPT || this.level == Logger.LEVEL_ERROR) {
            console.error(value);
        } else if(this.level == Logger.LEVEL_WARN) {
            console.warn(value);
        } else {
            console.log(value);
        }
    }

    private logout_file_impl(value) {
        let filename = `${this.now_date()}_${this.name}`;
        let logstream = fs.createWriteStream(path.join(this._path, `${filename}.log`), 
        {
            flags: 'a', encoding: 'utf8',
        });
        if(logstream) {
            logstream.write(`${value}${Logger.EOL}`);
            logstream.close();
        }
    }
}

//
export class Logger extends Singleton<Logger> {
    public static LEVEL_ALL = 0;
    public static LEVEL_INFO = 1;
    public static LEVEL_WARN = 2;
    public static LEVEL_ERROR = 3;
    public static LEVEL_EXCEPT = 4;

    public static EOL = os.EOL;

    private _root:string = "./";
    private _path:string = this._root;
    private _items:Array<LoggerItem> = new Array<LoggerItem>();
    private _content:Array<LoggerContent> = new Array<LoggerContent>();
    private _init_completed = false;

    constructor() {
        super();

        this._init_completed = false;
    }

    public async Init(root?:string) {
        if(root) { this._root = root; }
        this._path = path.join(this._root,"logs");

        if(!await this.onInit()) {
            return false;
        }

        setInterval(() => { this.logoutUpdate(); }, 100);

        this._init_completed = true;
        return true;
    }

    private async _mkdir(path:string) {
        if(path == null || path == undefined) {
            return false;
        }

        return new Promise((resolve, reject) => {
            let stat = fs.stat(path, (err, stat) => {
                if(stat && stat.isDirectory()) {
                    resolve(stat); 
                    return ;
                }
                
                // 语法检测无法通过
                fs.mkdir(path, { recursive: true, mode:0o777 }, (err) => {
                    if(err) {
                        resolve(false);
                        return ;
                    }
                    stat = fs.statSync(path);
                    resolve(stat); 
                });
            });
        });
    }

    protected async onInit() {
        if(! await this._mkdir(this._path)) {
            return false;
        }
        return true;
    }

    public AddLoggerItem(name:string, t_print:boolean = true, t_file:boolean = false, t_only:boolean = false, level = Logger.LEVEL_ALL) {
        name = name.toLowerCase();

        //
        let logger: LoggerItem = new LoggerItem({
            name: name,
            level: level,
            only: t_only,
            out_print: t_print,
            out_file: t_file,
            path: this._path,
        });

        if(this._items.find((v) => { return v.name == name; })) {
            return false;
        }

        this._items.push(logger);
        return true;
    }

    //
    public log(level:number, name:string, text?: any) {
        this.logout(level, text, name.toLowerCase());
    }

    // 每个参数之间用换行分割
    public info(text?: any, ...params: any[]) {
        let value = text;
        if(params) {
            params.forEach((v) => {
                value = `${value}${Logger.EOL}${v}`;
            });
        }
        this.logout(Logger.LEVEL_INFO, value);
    }
    public warn(text?: any, ...params: any[]) {
        let value = text;
        if(params) {
            params.forEach((v) => {
                value = `${value}${Logger.EOL}${v}`;
            });
        }
        this.logout(Logger.LEVEL_WARN, value);
    }
    public error(text?: any, ...params: any[]) {
        let value = text;
        if(params) {
            params.forEach((v) => {
                value = `${value}${Logger.EOL}${v}`;
            });
        }
        this.logout(Logger.LEVEL_ERROR, value);
    }
    public except(text?: any, ...params: any[]) {
        let value = text;
        if(params) {
            params.forEach((v) => {
                value = `${value}${Logger.EOL}${v}`;
            });
        }
        this.logout(Logger.LEVEL_EXCEPT, value);
    }

    private logout(level:number, value:string, name?:string) {
        this._content.push({ level: level, name:name, time: new Date().getTime(), value: value});
        return true;
    }

    private logoutUpdate() {
        if(!this._init_completed || this._content.length == 0) 
        { return ; }

        for(let i = 0; i < this._content.length; ) {
            this.logoutUpdateItems(this._content.shift());
        }
    }

    private logoutUpdateItems(log?:LoggerContent) {
        if(!log) { return false; }

        this._items.forEach((v) => {
            if(v.only && log.name && v.name == log.name) { v.logout(log); }
            else if(!v.only && (!log.name || v.name == log.name)) { v.logout(log); }
        });
        return true;
    }
}
