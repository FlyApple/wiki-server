
import * as process from "process";
import * as Redis from "redis";

 
// 必须截获异常，避免因为连接异常导致问题
Redis.RedisClient.prototype.index = 0;
Redis.RedisClient.prototype.on_error_impl = Redis.RedisClient.prototype.on_error;
Redis.RedisClient.prototype.on_error = function (error) {
    try { 
        this.on_error_impl(error)
    } catch (e) {
        console.warn("[Redis] ("+e.name+") : " +  "Exception : " + e.message);
    }
}
Redis.RedisClient.prototype.connection_gone_impl = Redis.RedisClient.prototype.connection_gone;
Redis.RedisClient.prototype.connection_gone = function (why, error) {
    try { 
        this.connection_gone_impl(why, error)
    } catch (e) {
        console.warn("[Redis] ("+e.name+") : " +  "Exception : " + e.message);
    }
}

//
export class RedisCache {
    protected _name:string = "redis_client";
    protected _options:any;
    protected _redisPool:Array<Redis.RedisClient> = [];
    protected _unusedPool:Array<Redis.RedisClient> = [];
    protected _unusedCount:number = 0;

    private _pingTick:number = 0;
    private _pingCount:number = 0;

    constructor(maxnum:number, options?:any) {
        this._options = {
            password: options && options.password ? options.password: "123456",
            host: options && options.host ? options.host: "127.0.0.1",
            port: options && options.port ? options.port: 6379,
            prefix: options && options.prefix ? options.prefix: "mx",
            retry_strategy: this._retry_strategy,
            no_ready_check: true
        };

        this._redisPool = [];

        for(let i = 0; i < maxnum; i ++) {
            let client:Redis.RedisClient = this._create(i, this._options);
            client.on("connect", () => {
                this.handleConnected(i, client);
            });
            client.on("ready", (err) => {
                this.handleReady(i, client, err);
            });
            client.on("end", (err) => {
                this.handleEnd(i, client, err);
            });
            client.on("message", (channel, message) => {
                this.handleMessage(i, client, {channel:channel, text:message});
            });
            client.on("error", (err) => {
                this.handleError(i, client, err);
            });

        }

        this._unusedCount = this._unusedPool.length;
    }

    public init(name?:string, callback?:Function) {
        if(!this._update()) {
            return false;
        }

        this._name = name || `redis_${process.ppid}`;
        this._pingCount = 0;
        this._pingTick = Date.now();
        return true;
    }

    private _log(text:string, level = 0, index:number = -1) {
        let log = ``;
        if(level == 3) {
            log = `[${this._name}${index >= 0 ? ` - ${index}` : ``}] (ERROR) : ${text}`;
        } else if (level == 2) {
            log = `[${this._name}${index >= 0 ? ` - ${index}` : ``}] (WARN) : ${text}`;
        } else {
            log = `[${this._name}${index >= 0 ? ` - ${index}` : ``}] ${text}`;
        }
        
        switch(level) {
            case 3 : console.error(log); break;
            case 2 : console.warn(log); break;
            default : console.info(log); break;
        }
    }

    private _create(index, options) {
        let client:any = Redis.createClient(options);
        client.index = index;
        this._redisPool.push(client);
        this._unusedPool.push(client);
        return client;
    }

    private _remove(client) {
        if(client != undefined && client != null) {
            this._unusedPool.splice(this._unusedPool.indexOf(client), 1);
            this._unusedCount --;
            this._redisPool.splice(this._redisPool.indexOf(client), 1);
        }
    }

    protected _retry_strategy(options) {
        if (options.error.code === 'ECONNREFUSED') { 
            this._log("("+options.error.code+") " + options.error.message, 2);
        } else if(options.error.code === 'ETIMEDOUT') {
            this._log("("+options.error.code+") " + options.error.message, 2);
        }
        return Math.max(options.attempt * 1000, 10000);
    }

    protected _update(interval = 1000) {
        let timer = setTimeout(() => {
            clearTimeout(timer);

            this.handleUpdate();

            this._update(interval);
        }, interval);
        return true;
    }
    private _alloc() {
        if(this._unusedPool.length > 0) {
            let client = this._unusedPool.pop() || null;
            this._unusedCount --;
            return client;
        }
        return null;
    }

    private _free(client:Redis.RedisClient| null) {
        if(client != null) {
            this._unusedPool.push(client);
            this._unusedCount ++;
        }
    }
    protected handleUpdate() {
        if(Date.now() - this._pingTick >= 10 * 1000) {
            this._pingTick = Date.now();

            this.ping();
        }

    }
    protected handleConnected(index, client) {
        this._log("connected", 0, index);
    }
    protected handleReady(index, client, error) {
        this._log((error ? "Error : (" + error.name + ") " + error.message: "ready"), 0, index);
    }
    protected handleEnd(index, client, error) {
        this._log((error ? "Error : (" + error.name + ") " + error.message: "end"), 0, index);
    }
    protected handleMessage(index, client, message) {
        this._log("("+ message.channel +") " + message.text, 0, index);
    }
    protected handleError(index, client, error) {
        this._log("Error : (" + error.name + ") " + error.message, 3, index);
    }

    public async ping() {

        this._pingCount ++;
        let tick = Date.now();
        let result = await this.set("ping", JSON.stringify({ tick:tick }), 60);
        let ms = Date.now() - tick;
        this._log("(Ping) : (count: " + this._pingCount + ", " + ms +" ms) " + (result ? "ok" : "fail"));
    }

    public set(key, value, duration: number = 24*60*60) : Promise<boolean> {
        return new Promise((resolve, reject) => {
            let client = this._alloc();
            if(client == null || !client.connected) {
                this._free(client);
                return resolve(false);
            }

            let tick = Date.now();
            if(!client.set(key, value, "EX", duration, (r) => {
                this._free(client);
    
                let ms = Date.now() - tick;
                this._log("(SET) : " + key + " ("+ value.length + ", "+ ms +" ms)");
                return resolve(true);
            })) {
                return resolve(false);
            }
        });
    }

    public get(key) : Promise<boolean|Error|any> {
        return new Promise((resolve, reject) => {
            let client = this._alloc();
            if(client == null || !client.connected) {
                this._free(client);
                return resolve(false);
            }

            let tick = Date.now();
            if(!client.get(key, (err, data) => {
                this._free(client);

                let ms = Date.now() - tick;
                let value = data || null;
            
                if(err) {
                    this._log("(GET) : " + key + " Error : " + err);
                    return resolve(err);
                }

                this._log("(GET) : " + key + " ("+ (value ? value.length : -1) + ", "+ ms +" ms)");
                return resolve(value);
            })) {
                return resolve(false);
            }
        });
    }

    public expire(key, duration: number = 24*60*60) : Promise<boolean> {
        return new Promise((resolve, reject) => {
            let client = this._alloc();
            if(client == null || !client.connected) {
                this._free(client);
                return resolve(false);
            }

            if(!client.expire(key, duration, (r) => {
                this._free(client);
                return resolve(r == null);
            })) {
                return resolve(false);
            }
        });
    }

    public del(key) : Promise<boolean>{
        return new Promise((resolve, reject) => {
            let client = this._alloc();
            if(client == null || !client.connected) {
                this._free(client);
                return resolve(false);
            }

            if(!client.del(key, () => {
                this._free(client);
                return resolve(true);
            })) {
                return resolve(false);
            }
        });
    }
}


let cache_redis_instance:RedisCache;

export let Cache_GetInstance = async (maxnum:number = 1, options:any = undefined) => {
    if(!cache_redis_instance) {
        cache_redis_instance = new RedisCache(maxnum, options);
        cache_redis_instance.init();
    }
    return cache_redis_instance;
} 