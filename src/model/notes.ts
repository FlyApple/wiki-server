import mx from "../utils";
import * as database from "../database/database";
import * as redis from "../redis/redis";
import * as mx_crypto from "../utils/crypto";

import config from "../config";

import * as user_model from "../model/user";

//
export namespace ServerParser {

    // 最大100页
    const PAGE_NOTES_MAXNUM = 100;
    const PAGE_NOTES_ITEMS_MAXNUM = 20;
    const PAGE_COMMIT_ITEMS_MAXNUM = 5;
    const PAGE_REPLY_ITEMS_MAXNUM = 2;
    // NOTE 评论每页
    const PAGE_NOTE_COMMIT_MAXNUM = 20;
    const PAGE_NOTE_REPLY_MAXNUM = 5;
    const PAGE_NOTE_REPLY_EXPAND_MAXNUM = 10;

    //
    let db = database.Database_GetInstance();

    //
    async function _DB_GetNoteData(tdb, data) {

        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        let sqlp = `(l.status = 1 or (l.status = 2 AND l.user_id = ?)) AND (l.id = ? AND l.nid = ?)`;
        let sql = `
        SELECT 
            l.id AS uid, l.nid, l.uuid, 
            a.user_id AS user_id, a.user_nid AS user_nid,  a.user_nm, 
            u.nickname AS user_nick,
            l.topping, l.create_time, l.update_time, 
            l.crypto_level, l.private_level, l.content, l.tags,
            l.view_count, l.shared_count, l.like_count, l.favorites_count, l.commit_count,
            IFNULL((SELECT 1 WHERE l.user_id = ? AND l.user_nid = ? AND l.auth_id = ? ), 0) AS is_editor,
            l.status
        FROM t_note_list l
        LEFT JOIN t_account a
        ON
            l.user_id = a.user_id AND l.user_nid = a.user_nid
        LEFT JOIN t_user u
        ON
            u.user_id = a.user_id
        WHERE
            ${sqlp}
        ORDER BY l.create_time DESC LIMIT 1
        ;
        `;
        let ret = await db.fragment(tdb, sql, [
            data.user_id, data.user_nid, data.auth_id, data.user_id,
            data.note_uid, data.note_nid,
        ], (err, res) => { error = err;  result = res.first; });
        if(ret == false) {
            return false;
        }

        return result;
    }

    //
    async function _DB_GetNotesList(tdb, last_data) {

        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        let sqlp = `l.status = 1 or (l.status = 2 AND l.user_id = ?)`;
        if(last_data.page > 0) {
            sqlp = `(${sqlp}) AND ${last_data.uid} > l.id AND (SELECT 1 AS RESULT FROM t_note_list WHERE id = ${last_data.uid} AND nid = "${last_data.nid}") = 1`;
        }

        // 过滤特定用户的NOTE列表
        if(last_data.mid) {
            sqlp = `l.user_nid = ${last_data.mid} AND (${sqlp})`;
        }

        let sql = `
        SELECT 
            l.id AS uid, l.nid, l.uuid, 
            a.user_id AS user_id, a.user_nid AS user_nid,  a.user_nm, 
            u.nickname AS user_nick,
            l.topping, l.create_time, l.update_time, 
            l.crypto_level, l.private_level, l.content, l.tags,
            l.view_count, l.shared_count, l.like_count, l.favorites_count, l.commit_count,
            IFNULL((SELECT 1 WHERE l.user_id = ? AND l.user_nid = ? AND l.auth_id = ? ), 0) AS is_editor,
            l.status
        FROM t_note_list l
        LEFT JOIN t_account a
        ON
            l.user_id = a.user_id AND l.user_nid = a.user_nid
        LEFT JOIN t_user u
        ON
            u.user_id = a.user_id            
        WHERE
            ${sqlp}
        ORDER BY l.create_time DESC LIMIT 0, ${PAGE_NOTES_ITEMS_MAXNUM}
        ;
        `;
        let ret = await db.fragment(tdb, sql, [
            last_data.user_id, last_data.user_nid, last_data.auth_id, last_data.user_id
        ], (err, res) => { error = err;  result = res.values; });
        if(ret == false) {
            return false;
        }
        return result;
    }

    // 
    async function _DB_UpdateViewCount(tdb, data) {
        let error:any = null;
        let affectRowsCount:number = -1;

        // 暂时处理公开的NOTE ITEM
        let sql = `
        UPDATE t_note_list l SET
            l.view_count = l.view_count + 1
        WHERE
            l.id = ? AND l.nid = ? AND l.status = 1;
        `;
        let ret = await db.fragment(tdb, sql, [
            data.note_uid, data.note_nid
          ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
          if(ret == false || affectRowsCount < 0) {
            return false;
        }

        return true;
    }

    //
    async function _DB_GetCommitList(tdb, data, count, order:"ASC"|"DESC" = "DESC") {

        //
        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        let sqlp = `l.status = 1 AND l.note_uid = ? AND l.note_nid = ? AND
                    l.reply_id = 0 AND isnull(l.reply_nid)`;
        if(data.page > 0) {
            if (order == "ASC") {
                sqlp = `(${sqlp}) AND ${data.uid} < l.id`
            } else {
                sqlp = `(${sqlp}) AND ${data.uid} > l.id`;
            }
            sqlp = `(${sqlp}) AND (SELECT 1 AS RESULT FROM t_note_list WHERE id = ${data.note_uid} AND nid = "${data.note_nid}") = 1`;
        }

        let sql = `
        SELECT 
            l.id AS uid, l.nid, l.uuid, l.note_uid, l.note_nid,
            a.user_id AS user_id, a.user_nid AS user_nid, a.user_nm, 
            u.nickname AS user_nick,
            l.create_time, l.update_time, 
            l.crypto_level, l.content, l.like_count, l.reply_count,
            IFNULL((SELECT 1 WHERE l.user_id = ? AND l.user_nid = ? AND l.auth_id = ? ), 0) AS is_editor,
            l.status
        FROM t_note_commitlist l
        LEFT JOIN t_account a
        ON
            l.user_id = a.user_id AND l.user_nid = a.user_nid
        LEFT JOIN t_user u
        ON
            u.user_id = a.user_id   
        WHERE
            ${sqlp}
        ORDER BY l.create_time ${order} LIMIT 0, ${count}
        ;
        `;
        let ret = await db.fragment(tdb, sql, [
            data.user_id, data.user_nid, data.auth_id,
            data.note_uid, data.note_nid,
          ], 
        (err, res) => { error = err;  result = res.values; });
        if(ret == false || error) {
            return false;
        } else if(!result) {
            return null;
        }

        return result;
    }

    //
    async function _DB_GetReplyList(tdb, data, count, order:"ASC"|"DESC" = "DESC") {

        //
        let result:any = null;
        let error:any = null;
        let affectRowsCount:number = -1;

        
        let sqlp = `l.status = 1 AND l.note_uid = ? AND l.note_nid = ? AND
                    l.reply_id = ? AND l.reply_nid = ?`;
        if(data.page > 0 || data.expand > 0) {
            if (order == "ASC") {
                sqlp = `(${sqlp}) AND ${data.uid} < l.id`
            } else {
                sqlp = `(${sqlp}) AND ${data.uid} > l.id`;
            }
            sqlp = `(${sqlp}) AND (SELECT 1 AS RESULT FROM t_note_list WHERE id = ${data.note_uid} AND nid = "${data.note_nid}") = 1`;
        }
        let sql = `
        SELECT 
            l.id AS uid, l.nid, l.uuid, 
            a.user_id AS user_id, a.user_nid AS user_nid, a.user_nm, 
            u.nickname AS user_nick,
            l.create_time, l.update_time, 
            l.crypto_level, l.content, l.like_count, 
            IFNULL((SELECT 1 WHERE l.user_id = ? AND l.user_nid = ? AND l.auth_id = ? ), 0) AS is_editor,
            l.reply_id AS reply_uid, l.reply_nid AS reply_nid, 
            l.replyto_id AS replyto_uid, l.replyto_nid AS replyto_nid, 
            l.status
        FROM t_note_commitlist l
        LEFT JOIN t_account a
        ON
            l.user_id = a.user_id AND l.user_nid = a.user_nid
        LEFT JOIN t_user u
        ON
            u.user_id = a.user_id   
        WHERE
            ${sqlp}
        ORDER BY l.create_time ${order} LIMIT 0, ${count}
        ;
        `;
        let ret = await db.fragment(tdb, sql, [
            data.user_id, data.user_nid, data.auth_id,
            data.note_uid, data.note_nid,
            data.commit_uid, data.commit_nid, 
          ], 
        (err, res) => { error = err;  result = res.values; });
        if(ret == false || error) {
            return false;
        } else if(!result) {
            return null;
        }
        return result;
    }

    //
    async function _DB_GetCommitsReplyList(tdb, list, count, order:"ASC"|"DESC" = "DESC") {
        let commit_list = list.commits;
        if(commit_list.length == 0) {
            return true;
        }

        commit_list.forEach(async (v, i) => {
            let replies_last = {
                page: 0,
                //
                user_id: list.user_id,
                auth_id: list.auth_id,
                user_nid: list.user_nid,
                note_uid: list.note_uid,
                note_nid: list.note_nid,
                commit_uid: v.uid,
                commit_nid: v.nid,
            };

            let result:any = await _DB_GetReplyList(tdb, replies_last, count, order);
            if(result) {
                v.replies = result;
            }
        });
        return true;
    }

    function _InitNoteListData(note_list_data) {
        note_list_data.count = note_list_data.items.length;
        for(let i = 0; i < note_list_data.count; i ++) {
            let item = note_list_data.items[i];
            
            _InitNoteData(item);

            if(i == 0) {
                note_list_data.last = { uid:item.uid, nid:item.nid };
            }
            if(i + 1 >= note_list_data.count) {
                note_list_data.next = { uid:item.uid, nid:item.nid };
            }
        }

        if(note_list_data.page == 0) {
            note_list_data.last = undefined;
        }
        if(note_list_data.count < PAGE_NOTES_ITEMS_MAXNUM) {
            note_list_data.next = undefined;
        }
    }

    function _InitNoteData(note_data) {
        //
        if(!note_data.tags || note_data.tags.length == 0) {
            note_data.tags = [];
        } else {
            note_data.tags = note_data.tags.split(";");
        }

        if(note_data.status == 2 && note_data.private_level == 0) {
            note_data.private_level = 1;
        }

        if(!note_data.is_editor || note_data.is_editor == 0) {
            note_data.is_editor = false;
        } else {
            note_data.is_editor = true;
        }
    }

    //
    function _InitCommitListData(commit_list_data) {
        commit_list_data.count = commit_list_data.commits.length;
        for(let i = 0; i < commit_list_data.count; i ++) {
            let item = commit_list_data.commits[i];
            
            _InitCommitData(item);

            if(i == 0) {
                commit_list_data.last = { uid:item.uid, nid:item.nid };
            }
            if(i + 1 >= commit_list_data.count) {
                commit_list_data.next = { uid:item.uid, nid:item.nid };
            }
        }

        if(commit_list_data.page == 0) {
            commit_list_data.last = undefined;
        }
        if(commit_list_data.count < PAGE_NOTES_ITEMS_MAXNUM) {
            commit_list_data.next = undefined;
        }
    }

    function _InitCommitData(commit_data) {
        //
        if(!commit_data.is_editor || commit_data.is_editor == 0) {
            commit_data.is_editor = false;
        } else {
            commit_data.is_editor = true;
        }
    }

    //
    function _InitReplyCommitListData(reply_list_data) {
        reply_list_data.count = reply_list_data.replies.length;
        for(let i = 0; i < reply_list_data.count; i ++) {
            let item = reply_list_data.replies[i];
            
            _InitReplyCommitData(item);

            if(i == 0) {
                reply_list_data.last = { uid:item.uid, nid:item.nid };
            }
            if(i + 1 >= reply_list_data.count) {
                reply_list_data.next = { uid:item.uid, nid:item.nid };
            }
        }

        if(reply_list_data.page == 0) {
            reply_list_data.last = undefined;
        }
        if(reply_list_data.count < PAGE_NOTES_ITEMS_MAXNUM) {
            reply_list_data.next = undefined;
        }
    }

    function _InitReplyCommitData(reply_data) {
        //
        if(!reply_data.is_editor || reply_data.is_editor == 0) {
            reply_data.is_editor = false;
        } else {
            reply_data.is_editor = true;
        }
    }

    //
    export function InitNoteListDataGetWithPublic(data) {
        // 
        for(let i = 0; i < data.count; i ++) {
            NoteDataGetWithPublic(data.items[i]);
        }
        return data;
    }

    export function NoteDataGetWithPublic(data) {
        //
        if(data.user_id == 0) {
            delete data.user_nid;
            delete data.user_nick;
        }
        delete data.user_id;
        delete data.auth_id;
        delete data.hash;
        delete data.ipaddress;
        delete data.device;  
        delete data.status;

        if(data.uid && typeof data.uid == "string") {
            data.uid = parseInt(data.uid);
        }

        if(data.commits) {
            InitCommitListDataGetWithPublic(data);
        }
        //
        return data;
    }

    export function InitCommitListDataGetWithPublic(data) {
        //
        if(data.user_id == 0) {
            delete data.user_nid;
            delete data.user_nick;
        }
        delete data.user_id;
        delete data.auth_id;
        delete data.status;

        if(data.uid && typeof data.uid == "string") {
            data.uid = parseInt(data.uid);
        }
        if(data.note_uid && typeof data.note_uid == "string") {
            data.note_uid = parseInt(data.note_uid);
        }

        // 
        for(let i = 0; i < data.count; i ++) {
            CommitDataGetWithPublic(data.commits[i]);
        }
        return data;
    }

    export function CommitDataGetWithPublic(data) {
        //
        if(data.user_id == 0) {
            delete data.user_nid;
            delete data.user_nick;
        }
        delete data.user_id;
        delete data.auth_id;
        delete data.hash;
        delete data.ipaddress;
        delete data.device;  
        delete data.status;

        if(data.uid && typeof data.uid == "string") {
            data.uid = parseInt(data.uid);
        }
        if(data.note_uid && typeof data.note_uid == "string") {
            data.note_uid = parseInt(data.note_uid);
        }

        if(data.replies) {
            InitReplyCommitListDataGetWithPublic(data);
        }

        //
        return data;
    }

    export function InitReplyCommitListDataGetWithPublic(data) {
        //
        if(data.user_id == 0) {
            delete data.user_nid;
            delete data.user_nick;
        }
        delete data.user_id;
        delete data.auth_id;
        delete data.status;

        if(data.uid && typeof data.uid == "string") {
            data.uid = parseInt(data.uid);
        }
        if(data.note_uid && typeof data.note_uid == "string") {
            data.note_uid = parseInt(data.note_uid);
        }
        if(data.commit_uid && typeof data.commit_uid == "string") {
            data.commit_uid = parseInt(data.commit_uid);
        }

        // 
        for(let i = 0; i < data.count; i ++) {
            ReplyCommitDataGetWithPublic(data.replies[i]);
        }
        return data;
    }

    export function ReplyCommitDataGetWithPublic(data) {
        //
        if(data.user_id == 0) {
            delete data.user_nid;
            delete data.user_nick;
        }
        delete data.user_id;
        delete data.auth_id;
        delete data.hash;
        delete data.ipaddress;
        delete data.device;  
        delete data.status;

        if(data.replyto_id == 0) {
            delete data.replyto_id;
            delete data.replyto_nid;
            delete data.replyto_uuid;
        }

        if(data.uid && typeof data.uid == "string") {
            data.uid = parseInt(data.uid);
        }
        if(data.note_uid && typeof data.note_uid == "string") {
            data.note_uid = parseInt(data.note_uid);
        }
        if(data.commit_uid && typeof data.commit_uid == "string") {
            data.commit_uid = parseInt(data.commit_uid);
        }
        //
        return data;
    }

    // 发送NOTE
    export async function SendingNote(auth_data, note_data) {
        // 检测UUID
        if(!mx.checkUUID(note_data.uuid)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        // 加密等级
        let tagv = note_data.tags.split(/[; ]/i);

        let hash = mx.crypto.md5HashString(note_data.uuid);
        let nid = mx.generateNID({ type: 2, code: 1, value: mx.generateHASH(hash) });
        let sending_note_data = {
            uid: 0,
            nid: nid,
            hash: hash,
            uuid: note_data.uuid,
            content: note_data.content,
            tagv: tagv,
            crypto_level: 0,
            ipaddress: note_data.ipaddress,
            device: note_data.device,
        }
        if(note_data.crypto_level == 1) {
            sending_note_data.crypto_level = 1;
        }

        // BASE64检测
        if(sending_note_data.crypto_level > 0 && /[0-9a-zA-Z_\-+/=]/g.test(sending_note_data.content) == false) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        // 不允许HTML标签
        } else if(/[<>{}*#~`]/g.test(sending_note_data.content)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        console.info(sending_note_data);

        //
        let db_query = await db.begin();
        if(db_query.err) {
        return db_query.err;
        }
        
        let uid:number = 0;
        let tags: string = tagv.join(";");
        let error:any = null;
        let affectRowsCount:number = -1;

        let sql = `
        INSERT INTO t_note_list
            (nid, user_id, auth_id, user_nid, update_time, crypto_level, content, tags, view_count, topping, uuid, status)
        VALUES
            (?, ?, ?, ?, NULL, ?, ?, ?, 0, 0, ?, 1)
        ;
        `;
        let ret = await db.fragment(db_query, sql, [
            sending_note_data.nid,
            auth_data.user_id, auth_data.auth_id, auth_data.user_nid,
            sending_note_data.crypto_level, sending_note_data.content, 
            !tags || tags.length == 0 ? null : tags, sending_note_data.uuid,
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; uid = res.first.insertId; });
        if(ret == false || affectRowsCount < 0 || uid < 0) {
            await db.rollback(db_query.query);
            return false;
        }
        sending_note_data.uid = uid;

        //
        await db.commit(db_query.query);

        //
        return sending_note_data;
    }

    // 发送NOTE COMMIT
    export async function SendingCommit(auth_data, commit_data) {
        if(/^[\d]{4,12}$/g.test(commit_data.note_uid) == false || /^[0-9a-zA-Z]{6,32}$/g.test(commit_data.note_nid) == false) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        // 检测UUID
        if(!mx.checkUUID(commit_data.uuid) || !mx.checkUUID(commit_data.note_uuid)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        // 加密等级
        let hash = mx.crypto.md5HashString(commit_data.uuid);
        let nid = mx.generateNID({ type: 2, code: 2, value: mx.generateHASH(hash) });
        let sending_commit_data = {
            note_uid: commit_data.note_uid,
            note_nid: commit_data.note_nid,
            note_uuid: commit_data.note_uuid,
            uid: 0,
            nid: nid,
            hash: hash,
            uuid: commit_data.uuid,
            content: commit_data.content,
            crypto_level: 0,
            ipaddress: commit_data.ipaddress,
            device: commit_data.device,
        }
        if(commit_data.crypto_level == 1) {
            sending_commit_data.crypto_level = 1;
        }

        // BASE64检测
        if(sending_commit_data.crypto_level > 0 && /[0-9a-zA-Z_\-+/=]/g.test(sending_commit_data.content) == false) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        // 不允许HTML标签
        } else if(/[<>{}*#~`]/g.test(sending_commit_data.content)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        console.info(sending_commit_data);

        //
        let db_query = await db.begin();
        if(db_query.err) {
        return db_query.err;
        }
        
        let uid:number = 0;
        let error:any = null;
        let affectRowsCount:number = -1;

        let sql = `
        INSERT INTO t_note_commitlist
            (nid, user_id, auth_id, user_nid, update_time, note_uid, note_nid, crypto_level, content, uuid, status)
        VALUES
            (?, ?, ?, ?, NULL, (SELECT id FROM t_note_list WHERE id = ? AND nid = ?), ?, ?, ?, ?, 1)
        ;
        `;
        let ret = await db.fragment(db_query, sql, [
            sending_commit_data.nid,
            auth_data.user_id, auth_data.auth_id, auth_data.user_nid,
            sending_commit_data.note_uid, sending_commit_data.note_nid, sending_commit_data.note_nid,
            sending_commit_data.crypto_level, sending_commit_data.content, 
            sending_commit_data.uuid,
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; uid = res.first.insertId; });
        if(ret == false || affectRowsCount < 0 || uid < 0) {
            await db.rollback(db_query.query);
            return false;
        }
        sending_commit_data.uid = uid;

        sql = `
        UPDATE t_note_list l SET
            l.commit_count = l.commit_count + 1
        WHERE
            l.id = ? AND l.nid = ? AND l.status = 1;
        `;
        ret = await db.fragment(db_query, sql, [
            sending_commit_data.note_uid, sending_commit_data.note_nid,
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
        if(ret == false || affectRowsCount < 0) {
            await db.rollback(db_query.query);
            return false;
        }

        //
        await db.commit(db_query.query);

        //
        return sending_commit_data;
    }

    // 发送NOTE COMMIT
    // 设计局限性，MYSQL不可以查询当前表的同时插入项目，故无法校验COMMIT ID是否存在
    export async function ReplyCommit(auth_data, reply_commit_data) {
        // 
        if(/^[\d]{4,12}$/g.test(reply_commit_data.note_uid) == false || /^[0-9a-zA-Z]{6,32}$/g.test(reply_commit_data.note_nid) == false) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        if(/^[\d]{4,12}$/g.test(reply_commit_data.commit_uid) == false || /^[0-9a-zA-Z]{6,32}$/g.test(reply_commit_data.commit_nid) == false) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        if(reply_commit_data.replyto_uid > 0 && 
            (/^[\d]{4,12}$/g.test(reply_commit_data.replyto_uid) == false || /^[0-9a-zA-Z]{6,32}$/g.test(reply_commit_data.replyto_nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        // 检测UUID
        if(!mx.checkUUID(reply_commit_data.uuid) 
        || !mx.checkUUID(reply_commit_data.note_uuid) 
        || !mx.checkUUID(reply_commit_data.commit_uuid)
        || (reply_commit_data.replyto_uid > 0 && !mx.checkUUID(reply_commit_data.replyto_uuid))) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        // 加密等级
        let hash = mx.crypto.md5HashString(reply_commit_data.uuid);
        let nid = mx.generateNID({ type: 2, code: 2, value: mx.generateHASH(hash) });
        let sending_reply_commit_data = {
            note_uid: reply_commit_data.note_uid,
            note_nid: reply_commit_data.note_nid,
            note_uuid: reply_commit_data.note_uuid,
            commit_uid: reply_commit_data.commit_uid,
            commit_nid: reply_commit_data.commit_nid,
            commit_uuid: reply_commit_data.commit_uuid,
            replyto_uid: 0,
            replyto_nid: null,
            replyto_uuid: null,
            uid: 0,
            nid: nid,
            hash: hash,
            uuid: reply_commit_data.uuid,
            content: reply_commit_data.content,
            crypto_level: 0,
            ipaddress: reply_commit_data.ipaddress,
            device: reply_commit_data.device,
        }
        if(reply_commit_data.replyto_uid > 0) {
            sending_reply_commit_data.replyto_uid = reply_commit_data.replyto_uid;
            sending_reply_commit_data.replyto_nid = reply_commit_data.replyto_nid || null;
            sending_reply_commit_data.replyto_uuid = reply_commit_data.replyto_uuid || null;
        }
        if(reply_commit_data.crypto_level == 1) {
            sending_reply_commit_data.crypto_level = 1;
        }

        // BASE64检测
        if(sending_reply_commit_data.crypto_level > 0 && /[0-9a-zA-Z_\-+/=]/g.test(sending_reply_commit_data.content) == false) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        // 不允许HTML标签
        } else if(mx.txt.checkInvalidHTMLCharacters(sending_reply_commit_data.content)) {
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
        }

        console.info(sending_reply_commit_data);

        //
        let db_query = await db.begin();
        if(db_query.err) {
        return db_query.err;
        }
        
        let uid:number = 0;
        let error:any = null;
        let affectRowsCount:number = -1;

        let sql = `
        INSERT INTO t_note_commitlist
            (nid, user_id, auth_id, user_nid, update_time, 
            note_uid, note_nid, 
            reply_id, reply_nid, replyto_id, replyto_nid, 
            crypto_level, content, uuid, status)
        VALUES
            (?, ?, ?, ?, NULL, 
            (SELECT id FROM t_note_list WHERE id = ? AND nid = ?), ?, 
            ?, ?,
            ?, ?, -- ReplyTo uid, nid
            ?, ?, ?, 1)
        ;
        `;
        let ret = await db.fragment(db_query, sql, [
            sending_reply_commit_data.nid,
            auth_data.user_id, auth_data.auth_id, auth_data.user_nid,
            sending_reply_commit_data.note_uid, sending_reply_commit_data.note_nid, sending_reply_commit_data.note_nid,
            sending_reply_commit_data.commit_uid, sending_reply_commit_data.commit_nid,
            sending_reply_commit_data.replyto_uid, sending_reply_commit_data.replyto_nid,
            sending_reply_commit_data.crypto_level, sending_reply_commit_data.content, 
            sending_reply_commit_data.uuid,
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; uid = res.first.insertId; });
        if(ret == false || affectRowsCount < 0 || uid < 0) {
            await db.rollback(db_query.query);
            return false;
        }
        sending_reply_commit_data.uid = uid;

        sql = `
        UPDATE t_note_commitlist l SET
            l.reply_count = l.reply_count + 1
        WHERE
            l.id = ? AND l.nid = ? AND l.status = 1;
        `;
        ret = await db.fragment(db_query, sql, [
            sending_reply_commit_data.commit_uid, sending_reply_commit_data.commit_nid,
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
        if(ret == false || affectRowsCount < 0) {
            await db.rollback(db_query.query);
            return false;
        }

        //
        await db.commit(db_query.query);

        //
        return sending_reply_commit_data;
    }


    // 获取NOTE LIST, 每次获取一页数据量
    // 由于time和id，是同时递增的
    export async function InitNoteList(auth_data, last_data) {

        //
        let user_id = 0;
        let auth_id = 0;
        let user_nid = "";

        // 用户已登录,需要检测登录是否设定为拥有者
        if(auth_data) {
            user_id = auth_data.user_id;
            auth_id = auth_data.auth_id;
            user_nid= auth_data.user_nid;
        }

        last_data.user_id = user_id;
        last_data.auth_id = auth_id;
        last_data.user_nid= user_nid;

        // 校验last_data
        // 页数最大为9999
        let page = last_data.page;
        if(page < 0) { page = 0; }
        if(page >= 10000 ) { page = 9999; }

        //
        if(last_data.mid && !mx.checkAccountNumber(last_data.mid)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }

        // 检测长度和必要格式，防止被注入
        if((last_data.uid > 0 && /^[\d]{4,12}$/g.test(last_data.uid) == false) || (last_data.nid.length > 0 && /^[0-9a-zA-Z]{6,32}$/g.test(last_data.nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }

        last_data.page = page;


        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }

        let result:any = null;
        result = await _DB_GetNotesList(db_query, last_data);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        //
        await db.commit(db_query.query);

        //
        let note_list_data = {
            page: page,
            //
            count: 0,
            items: result || [],
            time: mx.timestampS(),
            last: {} || undefined,
            next: {} || undefined,
        };

        _InitNoteListData(note_list_data);
        return note_list_data;
    }

    // 更新NOTE ITEM
    export async function ViewNoteItem(auth_data, item_data) {

        //
        let user_id = 0;
        let auth_id = 0;
        let user_nid = "";

        // 用户已登录,需要检测登录是否设定为拥有者
        if(auth_data) {
            user_id = auth_data.user_id;
            auth_id = auth_data.auth_id;
            user_nid= auth_data.user_nid;
        }

        let list_data = {
            //
            user_id: user_id,
            auth_id: auth_id,
            user_nid: user_nid,

            //
            page: 0,
            
            //
            note_uid: item_data.uid,
            note_nid: item_data.nid,
            count: 0,
            commits: [],
            time: mx.timestampS(),
            last: {} || undefined,
            next: {} || undefined,
        }

        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }
        
        let result:any = null;

        //
        result = await _DB_UpdateViewCount(db_query, list_data);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        // 时间递增，回复最早排最前面
        result = await _DB_GetCommitList(db_query, list_data, PAGE_COMMIT_ITEMS_MAXNUM, "ASC");
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        list_data.commits = result;

        result = await _DB_GetCommitsReplyList(db_query, list_data, PAGE_REPLY_ITEMS_MAXNUM, "ASC");
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        //
        await db.commit(db_query.query);

        _InitCommitListData(list_data);

        //
        return list_data;
    }

    // 更新NOTE ITEM
    export async function ViewNote(auth_data, note_data) {
        
        //
        let user_id = 0;
        let auth_id = 0;
        let user_nid = "";

        // 用户已登录,需要检测登录是否设定为拥有者
        if(auth_data) {
            user_id = auth_data.user_id;
            auth_id = auth_data.auth_id;
            user_nid= auth_data.user_nid;
        }
        let list_data = {
            //
            user_id: user_id,
            auth_id: auth_id,
            user_nid: user_nid,

            //
            page: 0,
            
            //
            note_uid: note_data.uid,
            note_nid: note_data.nid,
            count: 0,
            commits: [],
            time: mx.timestampS(),
            last: {} || undefined,
            next: {} || undefined,
        }

        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }
        
        let result:any = null;

        //
        result = await _DB_GetNoteData(db_query, list_data);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        note_data = result;

        result = await _DB_UpdateViewCount(db_query, list_data);
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        //
        await db.commit(db_query.query);

        //
        _InitNoteData(note_data);

        //
        return note_data;
    }


    // 获取COMMIT LIST, 每次获取一页数据量
    // 由于time和id，是同时递增的
    export async function InitCommitList(auth_data, last_data) {

        //
        let user_id = 0;
        let auth_id = 0;
        let user_nid = "";

        // 用户已登录,需要检测登录是否设定为拥有者
        if(auth_data) {
            user_id = auth_data.user_id;
            auth_id = auth_data.auth_id;
            user_nid= auth_data.user_nid;
        }

        // 校验last_data
        // 页数最大为9999
        let page = last_data.page;
        if(page < 0) { page = 0; }
        if(page >= 10000 ) { page = 9999; }
        // 检测长度和必要格式，防止被注入
        if((last_data.note_uid > 0 && /^[\d]{4,12}$/g.test(last_data.note_uid) == false) || (last_data.note_nid.length > 0 && /^[0-9a-zA-Z]{6,32}$/g.test(last_data.note_nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        if((last_data.uid > 0 && /^[\d]{4,12}$/g.test(last_data.uid) == false) || (last_data.nid.length > 0 && /^[0-9a-zA-Z]{6,32}$/g.test(last_data.nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }

        //
        let list_data = {
            //
            user_id: user_id,
            auth_id: auth_id,
            user_nid: user_nid,

            //
            page: page,
            
            //
            uid: last_data.uid,
            nid: last_data.nid,
            note_uid: last_data.note_uid,
            note_nid: last_data.note_nid,

            //
            count: 0,
            commits: [],
            time: mx.timestampS(),
            last: {} || undefined,
            next: {} || undefined,
        };


        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }

        let result:any = null;

        // 时间递减，发帖最新的排最前面
        result = await _DB_GetCommitList(db_query, list_data, PAGE_NOTE_COMMIT_MAXNUM, "DESC");
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        list_data.commits = result;

        result = await _DB_GetCommitsReplyList(db_query, list_data, PAGE_NOTE_REPLY_MAXNUM, "DESC");
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }

        //
        await db.commit(db_query.query);

        //
        _InitCommitListData(list_data);
        return list_data;
    }

    // 获取REPLY COMMIT LIST, 每次获取一次扩展数据，REPLY不翻页
    // 由于time和id，是同时递增的
    export async function InitReplyCommitList(auth_data, last_data) {

        //
        let user_id = 0;
        let auth_id = 0;
        let user_nid = "";

        // 用户已登录,需要检测登录是否设定为拥有者
        if(auth_data) {
            user_id = auth_data.user_id;
            auth_id = auth_data.auth_id;
            user_nid= auth_data.user_nid;
        }

        // 校验last_data
        // 页数最大为9999
        let page = last_data.page;
        if(page < 0) { page = 0; }
        if(page >= 10000 ) { page = 9999; }
        // 是否扩展
        let expand = last_data.expand;
        if(expand < 0) { expand = 0; }
        else { expand = 1; }

        // 检测长度和必要格式，防止被注入
        if((last_data.note_uid > 0 && /^[\d]{4,12}$/g.test(last_data.note_uid) == false) 
        || (last_data.note_nid.length > 0 && /^[0-9a-zA-Z]{6,32}$/g.test(last_data.note_nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        if((last_data.commit_uid > 0 && /^[\d]{4,12}$/g.test(last_data.commit_uid) == false) 
        || (last_data.commit_nid.length > 0 && /^[0-9a-zA-Z]{6,32}$/g.test(last_data.commit_nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }
        if((last_data.uid > 0 && /^[\d]{4,12}$/g.test(last_data.uid) == false) 
        || (last_data.nid.length > 0 && /^[0-9a-zA-Z]{6,32}$/g.test(last_data.nid) == false)) {
            return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
        }

        //
        let list_data = {
            //
            user_id: user_id,
            auth_id: auth_id,
            user_nid: user_nid,

            //
            page: page,
            expand: expand,
            
            //
            uid: last_data.uid,
            nid: last_data.nid,
            note_uid: last_data.note_uid,
            note_nid: last_data.note_nid,
            commit_uid: last_data.commit_uid,
            commit_nid: last_data.commit_nid,

            //
            count: 0,
            replies: [],
            time: mx.timestampS(),
            last: {} || undefined,
            next: {} || undefined,
        };


        //
        let db_query = await db.begin();
        if(db_query.err) {
            return db_query.err;
        }

        let result:any = null;

        // 时间递减，发帖最新的排最前面
        result = await _DB_GetReplyList(db_query, list_data, PAGE_NOTE_REPLY_EXPAND_MAXNUM, "DESC");
        if (!result) {
            await db.rollback(db_query.query);
            return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
        }
        list_data.replies = result;

        //
        await db.commit(db_query.query);

        //
        _InitReplyCommitListData(list_data);
        return list_data;
    }
}
