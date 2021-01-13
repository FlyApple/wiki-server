// Node mysql not support 'caching_sha2_password'
// Mysql 8.x or newer must set 'mysql_native_password'
// 'beginTransaction', 'commit', 'rollback' must engine 'InnoDB'
import * as mysql from 'mysql';
import xerror from '../utils/error';
import config from "../config";

//
export namespace Database {

  export class DBError extends xerror {
    /**
     * The sql state
     */
    public sql_state?: string;
    /**
     * Error message from MySQL
     */
    public sql_message?: string;

    public constructor(code:number = xerror.ERRORCODE_UNKNOW, name?:string, message?:string) {
      super(code, name, message);

      this.sql_state = name || "E00000";
      this.sql_message = message;
    }
  }

  function DBErrorNew(e:Error| xerror| mysql.MysqlError) : DBError {
    let err:DBError = new DBError(-1, e.name, e.message);
    err.stack = e.stack;
    
    if (e instanceof xerror) {
      //
    } else if((e as mysql.MysqlError)) {
      let t = e as mysql.MysqlError;
      err.sql_state = t.sqlState;
      err.sql_message = t.sqlMessage
    } 
    return err;
  }

  interface Database_Interface 
  {

  }

  export interface CBQueryResult {
    err: null| DBError;
    query: any;
    vals:any;
    fields:any;
  }

  export interface CBResultData {
    fields:any|Array<any>;
    values:any|Array<any>;
    count?:number;
    first?:any;  //取第一行为结果
    effect_count?:number;
  }
  const CBResultDataNew = (data?:CBResultData) => {
    let result:CBResultData = {values:null, fields:null, count:0, first:null, effect_count:-1};
    if(data) {
      result.values = data.values || null;
      result.fields = data.fields || null;
    }

    result.effect_count = -1;
    if(result.values) {
      //取第一行为结果，方便调用
      if(result.values instanceof Array) {
        if(result.values.length > 0) {
          result.first = result.values[0];
          result.count = result.values.length;
        } else {
          result.first = null;
          result.count = 0;
        }

        result.values.forEach((v, i) => {
          if(!result.effect_count || result.effect_count < 0) {
            result.effect_count = 0;
          }

          let effect_count = !v.affectedRows || v.affectedRows < 0 ? 0 : v.affectedRows;
          result.effect_count += Math.max(effect_count, v.changedRows);
        });
      } else {
        result.first = result.values;
        result.count = -1;

        //设置语句影响行数量
        let effect_count = result.values.affectedRows || -1;
        result.effect_count = Math.max(effect_count, result.values.changedRows);
      }
    }
    return result;
  }
  
  export type CBResultFunc = (err: null| DBError, data:CBResultData) => void;


  export abstract class Database_Base<T> implements Database_Interface {
    public static CONN_MAXNUM:number = 10;
    protected abstract _pool:any = null;

    protected _connUsedCount:number = 0;

    //
    public abstract rollback(query:T) : Promise<CBQueryResult>;
    public abstract commit(query:T) : Promise<CBQueryResult>;
    public abstract execute(sql:string, args?:Array<Object>, callback?:CBResultFunc) : Promise<boolean>;
    public abstract begin() : Promise<CBQueryResult>;
    public abstract fragment(result:CBQueryResult, sql:string, args?:Array<Object>, callback?:CBResultFunc) : Promise<boolean>;
  }

  export class Database_MYSQL extends Database_Base<mysql.PoolConnection>
  {
    protected _pool:any = mysql.createPool({
      host           : config.mysql.host,
      user           : config.mysql.user,
      password       : config.mysql.password,
      database       : config.mysql.database,
      charset        : 'utf8mb4',
      connectionLimit: Database_Base.CONN_MAXNUM,
      multipleStatements: true
    });

    constructor() {
      super();

      console.info(`[Database] Connect ${this._pool.config.connectionConfig.host}:${this._pool.config.connectionConfig.port}`);
      console.info(`[Database] Datebase ${this._pool.config.connectionConfig.database} - (${this._pool.config.connectionConfig.user})`);
    }

    private async _alloc_query() : Promise<CBQueryResult> {
      return new Promise((resolve, reject) => {
          this._pool.getConnection((err, conn) => {
              if (err) {
                  return reject({err:DBErrorNew(err), query:null, vals:null, fields: null});
              }
              this._connUsedCount ++;
              return resolve({err:null, query:conn, vals:null, fields: null});
          });
        });
    }

    private async _free_query(query:mysql.PoolConnection) {
      if(query != null) {
          query.release();
          this._connUsedCount --;
      }
    }

    private async _execute_query(query:mysql.PoolConnection, sql:string, args:Array<Object>) : Promise<CBQueryResult> {
      return new Promise((resolve, reject) => {
          if(query == null) {
            return resolve({err:null, query:null, vals:null, fields: null});
          }
          query.query(sql, args, (err, vals, fields) => {
            if(err) {
              return reject({err:DBErrorNew(err), query:null, vals:null, fields: null});
            }
            return resolve({err:null, query:query, vals:vals, fields: fields});
          });
        });
    } 

    private async _execute_impl(sql:string, args:Array<Object>, callback?:CBResultFunc) : Promise<boolean> {
      let query:any = null;
      try{
          let result = await this._alloc_query();
          if(result == null || result.query == null || result.err != null) {
              if(result.query != null) {
                  await this._free_query(result.query);
              }
              if(callback) {
                callback(DBErrorNew(result.err || new Error("Unknow")), CBResultDataNew());
              }
              return false;
          }

          query = result.query;
          result = await this._execute_query(query, sql, args);
          if(result == null || result.err != null) {
              if(result.query != null) {
                  this._free_query(result.query);
              }
              if(callback) {
                callback(DBErrorNew(result.err || new Error("Unknow")), CBResultDataNew());
              }
              return false;
          }

          if(callback) {
            callback(null, CBResultDataNew({values: result.vals, fields: result.fields}));
          }
          this._free_query(query)
      } catch (e){
          if(query != null) {
              this._free_query(query);
              query = null;
          }

          if(e.err != undefined) {
            e = e.err;
            console.error(`[Database] <Execute> Error : (${e.name}) ${e.message}`);
            //console.error(` TRACE:${e.stack}`);
          } else {
            console.error(`[Database] <Execute> Error :  ${e}`);
          }
          console.error(` SQL:${sql}`);
          return false;
      }
      return true;
    }

    public async rollback(query:mysql.PoolConnection) : Promise<CBQueryResult> {
      return new Promise((resolve, reject) => {
        if(query == null) {
          return resolve({err:null, query:null, vals:null, fields: null});
        }
        
        query.rollback((err) => {
          this._free_query(query);
          if(err) {
            return reject({err:DBErrorNew(err), query:null, vals:null, fields: null});
          }
          return resolve({err:null, query:null, vals:null, fields: null});
        }); 
      });
    }
    
    public async commit(query:mysql.PoolConnection) : Promise<CBQueryResult> {
      return new Promise((resolve, reject) => {
        if(query == null) {
          return resolve({err:null, query:null, vals:null, fields: null});
        }
    
        query.commit((err) => {
          this._free_query(query);
    
          if(err) {
            return reject({err:DBErrorNew(err), query:null, vals:null, fields: null});
          }
          return resolve({err:null, query:null, vals:null, fields: null});
        }); 
      });
    }

    public async execute(sql:string, args?:Array<Object>, callback?:CBResultFunc) : Promise<boolean> {
      if(args == undefined) { args = []; }

      //
      return await this._execute_impl(sql, args, callback);
    }

    public async begin() : Promise<CBQueryResult> {
      return new Promise((resolve, reject) => {
        this._pool.getConnection((err, conn) => {
              if (err) {
                  return reject({err:DBErrorNew(err), query:null, vals:null, fields: null});
              }
              conn.beginTransaction((err) => {
                  if(err) {
                    conn.release();
          
                    return reject({err:DBErrorNew(err), query:null, vals:null, fields: null});
                  }
                  this._connUsedCount ++;
                  return resolve({err:null, query:conn, vals:null, fields: null});
              });
          });
        });
    }

    private async _fragment_impl(result:CBQueryResult, sql:string, args:Array<Object>, callback?:CBResultFunc) : Promise<boolean> {
      try{
          let query = result.query;
          result = await this._execute_query(query, sql, args);
          if(result == null || result.err != null) {
              if(callback) {
                callback(DBErrorNew(result.err || new Error("Unknow")), CBResultDataNew());
              }
              return false;
          }

          if(callback) {
            callback(null, CBResultDataNew({values: result.vals, fields: result.fields}));
          }
      } catch (e){
          if(e.err != undefined) {
            e = e.err;
            console.error(`[Database] <Execute> Error : (${e.name}) ${e.message}`);
            //console.error(` TRACE:${e.stack}`);
          } else {
            console.error(`[Database] <Execute> Error :  ${e}`);
          }
          console.error(` SQL:${sql}`);
          return false;
      }
      return true;
    }

    public async fragment(result:CBQueryResult, sql:string, args?:Array<Object>, callback?:CBResultFunc) : Promise<boolean> {
      if(args == undefined) { args = []; }

      //
      return await this._fragment_impl(result, sql, args, callback);
    }

    protected async _updateImpl() {
      let tick = new Date().getTime();
      let sql = `
        show status like '%innodb%';
      `;
      let result:any|null = null;
      let error:DBError|null = null;
      if(!await this.execute(sql, [], (err, data) => { error = err; result = data.values; })) {
        console.error(`[Database] (update) : Error ${error}`);
        return false;
      }

      // 将数组转换成对象
      let data:any = {};
      result.forEach(v => {
        data[v.Variable_name.toLowerCase()] = v.Value;
      });

      let time = new Date().getTime() - tick;
      console.info(`[Database] (status) : (${Date.now()},${time} ms) SELECTED: ${data.innodb_rows_read}, INSERTED: ${data.innodb_rows_inserted}`);
    }

    protected async _update(interval:number = 1000, callback?:Function) {
      let timer = setTimeout(async () => {
        clearTimeout(timer);

        let result = await this._updateImpl();
        if(callback) { callback(result); }

        this._update(interval, callback);
      }, interval);
      return true;
    }

    public async update(interval:number = 1000, callback?:Function) {
      if(!await this._update(interval, callback)) {
        return false;
      }
      return true;
    }
  }
}

let database_mysql_instance;

export let Database_GetInstance = (callback?:Function) =>{
  if(!database_mysql_instance) {
    database_mysql_instance = new Database.Database_MYSQL();
    database_mysql_instance.update(10*1000, (result) => {
      callback && callback(result);
    });
  }
  return database_mysql_instance;
};
