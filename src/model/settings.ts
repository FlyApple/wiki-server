import mx from "../utils";
import * as database from "../database/database";
import * as redis from "../redis/redis";

import config from "../config";

//
export namespace ServerSettings {
    //
    let db = database.Database_GetInstance();

    //
    async function _DB_GetSettings(tdb) {
        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        let sql = `
        SELECT * FROM main.t_settings s
        WHERE 
            s.status > 0
        ORDER BY create_time DESC LIMIT 1;
        `;
        let ret = await db.fragment(tdb, sql, [
            //
        ], (err, res) => { error = err;  result = res.first; });
        if(ret == false) {
            return false;
        }

        return result;
    }

    export function SettingsDataGetWithPublic(data) {
        //
        delete data.id;
        delete data.name;
        delete data.status;
        //
        delete data.history;
        return data;
    }

    // 获取系统设置
    export async function GetSettings() {

        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }

        let result:any = null;
        result = await _DB_GetSettings(db_query);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        
        let settings_data = result;
        settings_data.history = [];

        //
        await db.commit(db_query.query);

        settings_data.tick = mx.timestampMS();
        settings_data.time_local = (new Date()).toString();
        settings_data.time_utc = (new Date()).toUTCString();

        //
        return settings_data;
    }
}
