import mx from "../utils";
import * as database from "../database/database";
import * as redis from "../redis/redis";

import config from "../config";

//
export namespace ServerModel {
    //
    let db = database.Database_GetInstance();

    // 
    async function _DB_AddFollow(tdb,  follower, following) {
        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        // 目标信息
        let sql = `
        SELECT 
            u.id AS uid, u.user_id, u.user_nid, u.auth_id, 
            u.following, u.followers
        FROM t_user u
        WHERE 
            u.user_nid = ?;
        `;
        let ret = await db.fragment(tdb, sql, [
            following.user_nid,
        ], (err, res) => { error = err;  result = res.first; });
        if(ret == false) {
            return false;
        }
        following = result;

        // 检查自身
        sql = `
        SELECT 
            u.id AS uid, u.user_id, u.user_nid, u.auth_id, 
            u.following, u.followers,
            f.id AS fid
        FROM t_user u
        LEFT JOIN t_follow f
        ON
            u.id = f.user_did AND f.following_nid = ? AND f.status > 0
        WHERE 
            u.auth_id = ? AND u.user_nid = ?;
        `;
        ret = await db.fragment(tdb, sql, [
            following.user_nid, 
            follower.auth_id, follower.user_nid,
        ], (err, res) => { error = err;  result = res.first; });
        if(ret == false) {
            return false;
        }
        follower = result;

        // 已经在关注列表中
        if(follower.fid > 0) {
            following.followed = true;
            return following;
        }

        let fid = -1;
        // 将自身插入关注列表
        sql = `
        INSERT INTO t_follow (
            user_id, user_nid, auth_id, user_did, 
            following_id, following_nid
        ) VALUES (
            ?, ?, ?, ?,  
            ?, ?
        );
        `;
        ret = await db.fragment(tdb, sql, [
            follower.user_id, follower.user_nid, follower.auth_id, follower.uid,
            following.user_id, following.user_nid
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; fid = res.first.insertId; });
        if(ret == false || fid <= 0) {
            return false;
        }
        follower.fid = fid;
        following.followed = true;

        // 更新关注者和被关注者统计数据
        sql = `
        UPDATE t_user u SET u.following = u.following + 1
        WHERE u.id = ?;
        UPDATE t_user u SET u.followers = u.followers + 1
        WHERE u.id = ?;
        `;
        ret = await db.fragment(tdb, sql, [
            follower.uid, following.uid
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
        if(ret == false) {
            return false;
        }

        follower.following ++;
        following.followers ++;

        //
        return {
            follower: follower,
            following: following,
        };
    }

    // 
    async function _DB_RemoveFollow(tdb,  follower, following) {
        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        // 目标信息
        let sql = `
        SELECT 
            u.id AS uid, u.user_id, u.user_nid, u.auth_id, 
            u.following, u.followers
        FROM t_user u
        WHERE 
            u.user_nid = ?;
        `;
        let ret = await db.fragment(tdb, sql, [
            following.user_nid,
        ], (err, res) => { error = err;  result = res.first; });
        if(ret == false) {
            return false;
        }
        following = result;

        // 检查自身
        sql = `
        SELECT 
            u.id AS uid, u.user_id, u.user_nid, u.auth_id, 
            u.following, u.followers,
            f.id AS fid
        FROM t_user u
        LEFT JOIN t_follow f
        ON
            u.id = f.user_did AND f.following_nid = ? AND f.status > 0
        WHERE 
            u.auth_id = ? AND u.user_nid = ?;
        `;
        ret = await db.fragment(tdb, sql, [
            following.user_nid, 
            follower.auth_id, follower.user_nid,
        ], (err, res) => { error = err;  result = res.first; });
        if(ret == false) {
            return false;
        }
        follower = result;
        
        // 不在关注列表
        if(follower.fid <= 0) {
            following.followed = false;
            return following;
        }
        
        // 标记为该记录移除
        sql = `
        UPDATE t_follow f SET
            f.status  = 0
        WHERE
            f.user_id = ? AND f.user_nid = ? AND f.auth_id = ? AND
            f.id = ? AND
            f.following_id = ? AND f.following_nid = ?
        `;
        ret = await db.fragment(tdb, sql, [
            follower.user_id, follower.user_nid, follower.auth_id,
            follower.fid,
            following.user_id, following.user_nid
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
        if(ret == false) {
            return false;
        }
        following.followed = false;

        // 更新关注者和被关注者统计数据
        sql = `
        UPDATE t_user u SET u.following = u.following - 1
        WHERE u.id = ? AND u.following > 0;
        UPDATE t_user u SET u.followers = u.followers - 1
        WHERE u.id = ? AND u.followers > 0;
        `;
        ret = await db.fragment(tdb, sql, [
            follower.uid, following.uid
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
        if(ret == false) {
            return false;
        }

        if(follower.following > 0) { follower.following --; }
        if(following.followers > 0) { following.followers --; }

        //
        return {
            follower: follower,
            following: following,
        };
    }


    export function FollowDataGetWithPublic(data) {
        //
        if(data.follower) {
            delete data.follower.uid;
            delete data.follower.user_id;
            delete data.follower.fid;
        }
        if(data.following) {
            delete data.following.uid;
            delete data.following.user_id;
            delete data.following.fid;
        }
        return data;
    }

    // 关注
    export async function Following(auth_data, follow_data) {

        //
        if(!mx.checkAccountNumber(follow_data.user_nid) || !mx.checkAccountNumber(follow_data.following_user_nid)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        // 必须登录，验证ID和用户ID一致
        // follow 用户不能是自身
        if(!auth_data || auth_data.user_nid != follow_data.user_nid || auth_data.user_nid == follow_data.following_user_nid) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        let follower = {
            user_id: auth_data.user_id,
            user_nid: auth_data.user_nid,
            auth_id: auth_data.auth_id,
        }

        let following = {
            user_nid: follow_data.following_user_nid,
            followed: undefined,
        }

        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }

        // 添加关注者进自身列表
        let result:any = null;
        result = await _DB_AddFollow(db_query, follower, following);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        follow_data = result;

        console.info(follow_data);

        //
        await db.commit(db_query.query);

        //
        return follow_data;
    }

    // 取消关注
    export async function Cancel(auth_data, follow_data) {

        //
        if(!mx.checkAccountNumber(follow_data.user_nid) || !mx.checkAccountNumber(follow_data.following_user_nid)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        // 必须登录，验证ID和用户ID一致
        // follow 用户不能是自身
        if(!auth_data || auth_data.user_nid != follow_data.user_nid || auth_data.user_nid == follow_data.following_user_nid) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        let follower = {
            user_id: auth_data.user_id,
            user_nid: auth_data.user_nid,
            auth_id: auth_data.auth_id,
        }

        let following = {
            user_nid: follow_data.following_user_nid,
            followed: true,
        }

        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }

        // 添加关注者进自身列表
        let result:any = null;
        result = await _DB_RemoveFollow(db_query, follower, following);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        follow_data = result;

        console.info(follow_data);

        //
        await db.commit(db_query.query);

        //
        return follow_data;
    }
}
