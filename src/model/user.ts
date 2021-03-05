//2021-01-28 移除账号表里的用户信息，用户信息按独立表

import mx from "../utils";
import * as database from "../database/database";
import * as redis from "../redis/redis";
import * as mx_crypto from "../utils/crypto";

import * as email_client from "../utils/email";
import {XRegionToAny} from "../utils/country";

import config from "../config";


//
export namespace ServerModel {

  //
  export interface USER_AUTH_DATA {
    user_id: number;
    user_nid: string;
    auth_id: number;
    ipaddress: string;
    device: string;
    code: string;
    hash: string;
    time: number;         //单位秒
    expired: number;
  };
  export interface USER_AUTH_DATA_INIT extends USER_AUTH_DATA {
    // 通用状态不包括历史记录
    history: Array<any>;
  }
  export interface USER_AUTH_DATA_EXIT extends USER_AUTH_DATA {
  }

  //
  let db = database.Database_GetInstance();
  let email = email_client.EMailClient_Instance;

  // 注册账号
  export async function UserRegister(query) {
    //console.info(query);

    let account = {
      number:"",
      name:"",
      email:"",
      phone:"",
      current:"",
      type_index:-1,
      type_name:"",
    };
    let user_pw = query.user_pw.trim();

    // 邮箱注册
    if(query.type == mx.defs.ACCOUNT_TYPE_EMAIL) {
      account.email = query.user_email.trim();
      account.name = (query.user_nm || "").trim();
      account.current = account.email;
      account.type_index = mx.defs.ACCOUNT_TYPE_EMAIL;
      account.type_name = mx.defs.ACCOUNT_TYPENAME_EMAIL;
    } else {
      return new database.Database.DBError(-109, "Not support sign up types.");
    }

    if((account.type_index == mx.defs.ACCOUNT_TYPE_EMAIL && !mx.checkEmail(account.email)) ||
      (account.type_index == mx.defs.ACCOUNT_TYPE_PHONE && !mx.checkPhone(account.phone)) ||
      (account.name.length > 0 && (!mx.checkAccountName(account.name, 6, mx.defs.ACCOUNT_NAME_MAXLEN) || 
          !mx.checkAccountNameX(account.name)))) {
      return new database.Database.DBError(-100, "Account Invalid");
    }

    // 密码必须是文本HASH
    if(mx.checkValueNull(user_pw) || !(user_pw = user_pw.trim().toUpperCase()) || (user_pw.length != mx.defs.PASSWORD_MD5_MAXLEN &&
      user_pw.length != mx.defs.PASSWORD_SHA1_MAXLEN &&
      user_pw.length != mx.defs.PASSWORD_SHA256_MAXLEN)) {
      return new database.Database.DBError(-101, "Password Invalid");
    }

    //
    account.number = mx.generateUID(4);
    if(mx.checkValueNull(account.name)) {
      account.name = `mid${account.number}`;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    // 获取用户信息, 同时检测NID是否重复
    let sql = `
    SELECT 
	    user_nid, user_nm, user_email, user_phone, create_time
    FROM t_account a
    WHERE
      (? = a.user_nid) or
      (1=? and not isnull(a.user_nm) and a.user_nm = ?) or
      (2=? and not isnull(a.user_phone) and a.user_phone = ?) or
      (3=? and not isnull(a.user_email) and a.user_email = ?) or
      (not isnull(?) and a.user_nm = ?)
    ;
    `;
    let ret = await db.execute(sql, [ 
      account.number,
      account.type_index, account.name,
      account.type_index, account.phone,
      account.type_index, account.email,
      account.name, account.name
    ], (err, res) => { error = err; result = res.first; });
    if(ret == false) {
      return error || new database.Database.DBError(-1, "Database Unknow Error");
    }
    if(result) {
      return new database.Database.DBError(-102, "Account already exist");
    }

    // 添加账号表 
    // 添加邮箱验证
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }
    
    // SDK API及相关
    let priv_code = mx.generateUID(1);
    let priv_time = mx.timestampS();
    // 计算shared key, 可由用户修改
    let shared_key = mx.crypto.md5HashString(`${priv_code}${priv_time}`);
    // 该KEY不受修改影响，账号一经创建，将固定
    let api_key = mx.crypto.md5HashString(`${shared_key}${mx.generateUID(0)}`);

    // 邮箱注册
    // privilege: 0-封号, 1-游客, 2-已注册用户, 3-用户
    if(account.type_index == mx.defs.ACCOUNT_TYPE_EMAIL) {
      let account_uid = -1;
      let auth_uid = -1;
      let user_uid = -1;
      let money_uid = -1;

      // 账号添加
      sql = `
      -- Account : 
      INSERT INTO t_account
        (user_nid, user_nm, user_pw, user_email, privilege)
      VALUES
        (?, ?, ?, ?, (SELECT id FROM t_privilege WHERE level = ? AND status = 1 LIMIT 1))
      ;
      `;
      ret = await db.fragment(db_query, sql, [
          account.number, account.name, user_pw, account.email, mx.defs.PRIVILEGE_LEVEL_REGISTERED,
        ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; account_uid = res.first.insertId; });
      if(ret == false || affectRowsCount < 0 || account_uid < 0) {
        await db.rollback(db_query.query);
        return error || new database.Database.DBError(-1, "Database Unknow Error");
      }

      // 验证信息添加
      sql = `
      -- Auth : Maybe insert last id bugs
      INSERT INTO t_auth
        (user_id, user_nid, auth_code, auth_hash, shared_key, api_key)
      VALUES
        (?, ?, NULL, NULL, ?, ?)
      ;
      `;
      ret = await db.fragment(db_query, sql, [
        account_uid, account.number, shared_key, api_key
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; auth_uid = res.first.insertId; });
      if(ret == false || affectRowsCount < 0 || auth_uid < 0) {
        await db.rollback(db_query.query);
        return error || new database.Database.DBError(-1, "Database Unknow Error");
      }

      // 用户信息添加
      sql = `
      -- User : Maybe insert last id bugs
      INSERT INTO t_user
        (user_id, user_nid, auth_id)
      VALUES
        (?, ?, ?)
      ;
      `;
      ret = await db.fragment(db_query, sql, [
        account_uid, account.number, auth_uid
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; user_uid = res.first.insertId; });
      if(ret == false || affectRowsCount < 0 || user_uid < 0) {
        await db.rollback(db_query.query);
        return error || new database.Database.DBError(-1, "Database Unknow Error");
      }

      // 钱包信息
      sql = `
      -- User : Maybe insert last id bugs
      INSERT INTO t_money
        (user_id, user_nid, auth_id)
      VALUES
        (?, ?, ?)
      ;
      `;
      ret = await db.fragment(db_query, sql, [
        account_uid, account.number, auth_uid
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; money_uid = res.first.insertId; });
      if(ret == false || affectRowsCount < 0 || money_uid < 0) {
        await db.rollback(db_query.query);
        return error || new database.Database.DBError(-1, "Database Unknow Error");
      }
    } else {
      return new database.Database.DBError(-2, "Internal Unknow Error");
    }

    result = await _DB_UserDataGet(db_query, 0, account);
    if(result == false || result == null) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-103, "Get User Data Error");
    }

    //
    let user_data = result;
    user_data.ipaddress = query.ipaddress;
    user_data.device = query.device;
    user_data.auth_used = 0;
    user_data.user_account =  account.current;

    //console.info(user_data);
    // 打印注册用户信息
    console.log(`[${mx.datetimeFormat(null)}] [Register] (${user_data.user_id} - IP:${user_data.ipaddress}) MID:${user_data.user_nid} ${user_data.user_nm}`)


    // 发送注册认证信息
    ret = await _DB_UserVerifying(db_query, account.type_index, user_data, true);
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-108, "Verifying Unknow Error");
    }

    await db.commit(db_query.query);

    return user_data;
  }

  // 登录账号
  export async function UserLogin(query) {
    console.info(query);
  
    let account = {
      number:"",
      name:"",
      email:"",
      phone:"",
      current:"",
      type_index:-1,
      type_name:"",
    };
    let user_pw = query.user_pw.trim();
    let user_nm = query.user_nm.trim();

    
    let rv:any|string|boolean = mx.checkEmail(user_nm);
    if(rv) {
      account.type_index = mx.defs.ACCOUNT_TYPE_EMAIL;
      account.type_name = mx.defs.ACCOUNT_TYPENAME_EMAIL;
      account.email = (rv as string).trim(); 
      account.current = account.email;
    } else if((rv = mx.checkPhone(user_nm))) {
      account.type_index = mx.defs.ACCOUNT_TYPE_PHONE;
      account.type_name = mx.defs.ACCOUNT_TYPENAME_PHONE;
      account.phone = (rv as string).trim(); 
      account.current = account.phone;
    } else if((rv = mx.checkAccountNumber(user_nm, 5, mx.defs.ACCOUNT_NUMBER_MAXLEN))) {
      account.type_index = mx.defs.ACCOUNT_TYPE_MID;
      account.type_name = mx.defs.ACCOUNT_TYPENAME_MID;
      account.number = (rv as string).trim(); 
      account.current = account.number;
    } else if((rv = mx.checkAccountName(user_nm, 6, mx.defs.ACCOUNT_NAME_MAXLEN))) {
      account.type_index = mx.defs.ACCOUNT_TYPE_NAME;
      account.type_name = mx.defs.ACCOUNT_TYPENAME_NAME;
      account.name = (rv as string).trim(); 
      account.current = account.name;
    } else {
      return new database.Database.DBError(-100, "Account Invalid");
    }

    if(mx.checkValueNull(user_pw) || !(user_pw = user_pw.trim().toUpperCase()) || (user_pw.length != mx.defs.PASSWORD_MD5_MAXLEN &&
      user_pw.length != mx.defs.PASSWORD_SHA1_MAXLEN &&
      user_pw.length != mx.defs.PASSWORD_SHA256_MAXLEN)) {
      return new database.Database.DBError(-101, "Password Invalid");
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;
    
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    result = await _DB_UserDataGet(db_query, 1, account);
    if(!result) {
      await db.rollback(db_query.query);
      if(result == null) {
        return new database.Database.DBError(-102, "Account not exist");
      } else {
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    }

    // 判断密码是否正确
    if(result.user_pw != user_pw) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-103, "Account password error");
    }

    let user_data = result;
    user_data.ipaddress = query.ipaddress;
    user_data.device = query.device;
    user_data.auth_used = 0;
    user_data.user_account =  account.current;
    console.info(user_data);

    // 打印登录用户信息
    console.log(`[${mx.datetimeFormat(null)}] [Login] (${user_data.user_id} - IP:${user_data.ipaddress}) MID:${user_data.user_nid} ${user_data.user_nm}`);

    // 检测登录时间间隔
    let auth_interval = (mx.timestampMS() - mx.timestampMS(new Date(user_data.auth_time))) / 1000;
    if(auth_interval < 1.0) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-104, `Account check time less : ${mx.numberFormat(auth_interval, 0, 2)}s < 1.0s`);
    }

    // 
    if(user_data.user_privilege >= 0) {
      // 需要admin解封,不支持自动解封
      if (user_data.user_privilege_level == mx.defs.PRIVILEGE_LEVEL_BANNED) {
        await db.rollback(db_query.query);
        let banned_time = user_data.privilege_time_expired;
        return new database.Database.DBError(-108, `Account banned, login denied (date time:${mx.datetimeFormat(mx.timestampS() + banned_time)})`);
      // // 检测账号登录权限, 是否需要验证账号
      // } else if (user_data.user_privilege_level == mx.defs.PRIVILEGE_LEVEL_REGISTERED) {
      //   await db.rollback(db_query.query);
      //   return new database.Database.DBError(-107, `Please verifying your ${
      //     user_data.verified_email <= 0 ? "email address" : (
      //     user_data.verified_phone <= 0 ? "phone number" : "account")
      //   }, login again.`);
      // 游客权限
      } else if (user_data.user_privilege_level <= mx.defs.PRIVILEGE_LEVEL_GUEST) {
        await db.rollback(db_query.query);
        return new database.Database.DBError(-106, `Account not allow login`);
      }
    }
    
    // 检测是否允许登录
    if(user_data.user_privilege <= 0 || user_data.privilege_allow_login == 0) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-109, `Account not allow login`);
    }

    let sql = `
      `;
    
    //
    result = await _DB_UserAuthInit(db_query, user_data);
    if (!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-110, `Account auth unknow error`);
    }
    
    user_data.auth_data = result;

    // 获取详细用户属性
    result = await _DB_UserDataDetailGet(db_query, user_data, user_data.auth_data);
    if(!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
    }
    user_data = { ...user_data, ...result };

    //
    await db.commit(db_query.query);


    return user_data;
  }

  // 注销账号
  export async function UserLogout(auth_data) {

    //
    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;
  
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    let user_data = {
      user_account:auth_data.user_nm || auth_data.user_nid,
      user_nid: auth_data.user_nid,
      auth_data: undefined,
    }

    let sql = `
    `;
    
    // 打印登出用户信息
    console.log(`[${mx.datetimeFormat(null)}] [Logout] (${auth_data.user_id} - IP:${auth_data.auth_ipaddress}) MID:${auth_data.user_nid} ${auth_data.user_nm}`);

    //
    result = await _DB_UserAuthExit(db_query, auth_data);
    if (!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-102, `Account auth unknow error`);
    }
    
    user_data.auth_data = result;

    //
    await db.commit(db_query.query);


    return user_data;
  }

  // 0:注册, 1:登录, 99:内部调用
  export async function _DB_UserDataGet(tdb, index, account) {

    let result:any = null;
    let error:any = null;

    let sql = `
    SELECT 
      a.user_id, a.user_nid, a.user_nm, a.user_email, a.user_phone, a.user_pw, a.create_time AS user_createtime,
      u.nickname AS user_nick,
      b.auth_id, b.auth_code, b.auth_hash, b.auth_ipaddress, b.auth_region, b.auth_device, 
      b.activated, b.activated_time, 
      b.verified_phone, b.verified_phone_time, b.verifying_phone, b.verifying_phone_time, 
      b.verified_email, b.verified_email_time, b.verifying_email, b.verifying_email_time,
      b.auth_used, b.auth_time, b.auth_expired,
      b.shared_key, b.api_key,
      TIMESTAMPDIFF(SECOND, NOW(), b.auth_expired) AS auth_time_expired,
      a.privilege AS user_privilege_id
    FROM t_account a
    LEFT JOIN t_auth b
	  ON
      b.user_id = a.user_id
    LEFT JOIN t_user u
    ON
      u.user_id = a.user_id
    WHERE
      -- private get data
      -- NID get data for value: 99
      (99 = ? and a.user_nid = ?) or
      -- UID,NID get data for value: 90 - 98, default: 90
      (90 <= ? and ? < 99 and a.user_id = ? and a.user_nid = ?) or
      -- register only check account name
      (0 = ? and a.user_nid = ? and a.user_nm = ?) or
      -- login check mid, name, email, phone
      (1 = ? and 
        (!isnull(a.user_nid) and a.user_nid = ?) or 
        (!isnull(a.user_nm) and a.user_nm = ?) or
        (!isnull(a.user_email) and a.user_email = ?) or
        (!isnull(a.user_phone) and a.user_phone = ?) 
      ) and 
      a.status >= 1;
    `;
    let ret = await db.fragment(tdb, sql, [
      index, account.number, //非UID，仅仅是MID获取用户信息
      index, index, account.uid, account.number,
      index, account.number, account.name,
      index, account.number, account.name, account.email, account.phone
    ], 
    (err, res) => { error = err; result = res.first; });
    if(ret == false || error) {
      return false;
    } else if(!result) {
      return null;
    }

    result.type_index = index;
    result.user_pw = (result.user_pw || "").trim().toUpperCase();
    result.auth_hash = (result.auth_hash || "").trim().toUpperCase();
    if(result.type_index == 0){
      result.type_name = "register";
    // 内部调用
    } else if(result.type_index >= 90) {
      result.type_name = "private";
      let temp:any = null;
      sql=`
      SELECT 
        a.privilege AS user_privilege_id, 
        IF(a.privilege > 0, TIMESTAMPDIFF(SECOND, NOW(), IF(isnull(a.privilege_expired), "${mx.defs.DATETIME_EXPIRED_MAX}", a.privilege_expired)), 
        IF(isnull(a.privilege_expired), 0, TIMESTAMPDIFF(SECOND, NOW(), a.privilege_expired))) AS privilege_time_expired,
        c.name AS privilege_name,
        c.level AS user_privilege_level,
        c.admin_level AS user_privilege_admin_level
      FROM t_account a 
      LEFT JOIN  t_privilege c
      ON
        a.privilege = c.id
      WHERE
        a.user_id = ? and a.user_nid = ? and a.status >= 1      
      ;
      `;
      let ret = await db.fragment(tdb, sql, [
        result.user_id, result.user_nid
      ], 
      (err, res) => { error = err; temp = res.first; });
      if(ret == false || error) {
        return false;
      }

      // 合并
      // ES5: Object.assign(result, temp);
      // ES6:
      result = {...result, ...temp};
    // 如果是登录补加权限信息
    } else {
      result.type_name = "login";
      let temp:any = null;
      sql=`
      SELECT 
        a.privilege AS user_privilege_id, 
        IF(a.privilege > 0, TIMESTAMPDIFF(SECOND, NOW(), IF(isnull(a.privilege_expired), "${mx.defs.DATETIME_EXPIRED_MAX}", a.privilege_expired)), 
        IF(isnull(a.privilege_expired), 0, TIMESTAMPDIFF(SECOND, NOW(), a.privilege_expired))) AS privilege_time_expired,
        c.name AS privilege_name,
        c.level AS user_privilege_level,
        c.admin_level AS user_privilege_admin_level,
        c.allow_login AS privilege_allow_login,
        c.allow_notes AS privilege_allow_notes,
        c.allow_share AS privilege_allow_share,
        c.allow_favorites AS privilege_allow_favorites,
        c.allow_like AS privilege_allow_like,
        c.allow_commit AS privilege_allow_commit
      FROM t_account a 
      LEFT JOIN  t_privilege c
      ON
        a.privilege = c.id
      WHERE
        a.user_id = ? and a.user_nid = ? and a.status >= 1      
      ;
      `;
      let ret = await db.fragment(tdb, sql, [
        result.user_id, result.user_nid
      ], 
      (err, res) => { error = err; temp = res.first; });
      if(ret == false || error) {
        return false;
      }

      // 合并
      // ES5: Object.assign(result, temp);
      // ES6:
      result = {...result, ...temp};
    }

    //
    return result;
  }

  export async function _DB_UserDataDetailGet(tdb, user_data:any, auth_data?:any) {
    let result:any = null;
    let error:any = null;

    let sql = `
    SELECT 
      u.id AS uid,
      u.nickname AS user_nick,
      u.gender AS user_gender,
      u.age AS user_age,
      u.country AS user_country,
      u.region AS user_region,
      u.maxim AS user_maxim,
      u.public_level AS user_public_level,
      u.following AS following,
      u.followers AS followers
    FROM main.t_user u
    WHERE
      u.user_id = ? AND u.user_nid = ?;
    `;
    let ret = await db.fragment(tdb, sql, [
      user_data.user_id, user_data.user_nid
    ], (err, res) => { error = err; result = res.first; });
    if(ret == false || error) {
        return null;
    }

    // 如果不存在，按NULL对象
    if(!result) { result = {}; }
    delete result.uid;
    let detail_data = result;
    detail_data.follow_level = 0;

    // 如果已经验证
    if(auth_data) {

      // 关注
      sql = `
        SELECT  f.id AS fid, IF(f.user_id = ?, 0, 1) AS level
        FROM main.t_follow f
        WHERE 
          ((f.user_id = ? AND f.user_nid = ?) AND
          (f.following_id = ? AND f.following_nid = ?) AND f.status > 0) OR
          ((f.user_id = ? AND f.user_nid = ?) AND
          (f.following_id = ? AND f.following_nid = ?) AND f.status > 0)
        ;
      `;
      ret = await db.fragment(tdb, sql, [
        user_data.user_id,
        user_data.user_id, user_data.user_nid,
        auth_data.user_id, auth_data.user_nid,
        auth_data.user_id, auth_data.user_nid,
        user_data.user_id, user_data.user_nid
      ], (err, res) => { error = err; result = res.values; });
      if(ret == false || error) {
          return null;
      }

      for(let i = 0; i < result.length; i ++) {
        if(result[i].fid > 0 && result[i].level == 0) {
          detail_data.follow_level = detail_data.follow_level | 0x01; // 他/她是粉丝
        }
        if(result[i].fid > 0 && result[i].level == 1) {
          detail_data.follow_level = detail_data.follow_level | 0x02; // 你是粉丝
        }
      }
    }
    //
    return detail_data;
  }

  async function _DB_UserVerifying(tdb, index, data, activate = true) {
    
    // 8位字符串, 包括小写字母, 数字
    let auth_code = mx.generateUID(1);
    if(index == mx.defs.ACCOUNT_TYPE_PHONE) {
      auth_code = mx.generateUID();
    }
    let auth_time = mx.timestampS();
    let auth_hash = mx.crypto.sha1HashString(`${data.auth_id}_${mx.generateUUID()}_${auth_time}`);

    let auth_data:USER_AUTH_DATA = {
      user_id: data.user_id,
      user_nid: data.user_nid,
      auth_id: data.auth_id,
      ipaddress: data.ipaddress,
      device: data.device,
      code: auth_code,
      hash: auth_hash,
      time: auth_time,
      expired: 60*60*24,
    };

    let error:any = null;
    let affectRowsCount:number = -1;
    let auth_uid = -1;
    // 插入验证记录
    let sql = `
    INSERT INTO t_history
      (auth_id, expired_time, auth_name, auth_code, auth_hash, auth_ipaddress, auth_region, auth_device, t_history.desc, t_history.status)
    VALUES
      (?, DATE_ADD(now(), interval ? second), ?, ?, ?, ?, NULL, ?, ?, ?)
    ;
    `;
    if(index == mx.defs.ACCOUNT_TYPE_PHONE) {
      let ret = await db.fragment(tdb, sql, [
        auth_data.auth_id, auth_data.expired, data.user_phone, 
        auth_data.code, auth_data.hash, auth_data.ipaddress, auth_data.device,
        "verifying_phone", 0
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; auth_uid = res.first.insertId; });
      if(ret == false || affectRowsCount < 0 || auth_uid < 0) {
        return false;
      } 

      // 更新当前验证信息, 关联表, 不需要更新状态, 注册完成需要登录
      sql = `
      UPDATE t_auth SET
	      auth_ipaddress = ?, auth_region = NULL, auth_device=?, 
        --  auth_code=NULL, auth_hash=NULL, 
        verifying_phone = ?, verifying_phone_time=now()
      WHERE user_id = ? and auth_id = ?;
      `;
      ret = await db.fragment(tdb, sql, [
      auth_data.ipaddress, auth_data.device, 
      auth_uid,
      auth_data.user_id, auth_data.auth_id
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
      if(ret == false || affectRowsCount < 0) {
        return false;
      }  
    } else if(index == mx.defs.ACCOUNT_TYPE_EMAIL) {
      let ret = await db.fragment(tdb, sql, [
        data.auth_id, auth_data.expired, data.user_email, 
        auth_data.code, auth_data.hash, auth_data.ipaddress, auth_data.device,
        "verifying_email", 0
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; auth_uid = res.first.insertId; });
      if(ret == false || affectRowsCount < 0 || auth_uid < 0) {
        return false;
      }  

      // 更新当前验证信息
      sql = `
      UPDATE t_auth SET
        auth_ipaddress = ?, auth_region = NULL, auth_device=?, 
        --  auth_code=NULL, auth_hash=NULL, 
        verifying_email = ?, verifying_email_time=now()
      WHERE user_id = ? and auth_id = ?;
      `;
      ret = await db.fragment(tdb, sql, [
        auth_data.ipaddress, auth_data.device, 
        auth_uid,
        auth_data.user_id, auth_data.auth_id
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
      if(ret == false || affectRowsCount < 0) {
        return false;
      }  

      if (activate) {
        email.send_activate_account("system@cmcmx.com", data.user_email,
          "Please activate your account", 
          data.user_nm,
          config.activate_account_url, {
            token_id: auth_data.auth_id,
            token_hash: auth_data.hash,
            token_time: auth_data.time
          }, (R) => {});
      } else {
        email.send_verifying_account("system@cmcmx.com", data.user_email,
        "Please verifying your account", 
        data.user_nm,
        config.activate_account_url, {
          token_id: auth_data.auth_id,
          token_hash: auth_data.hash,
          token_time: auth_data.time
        }, (R) => {});
      }
    } else {
      return false;
    }

    //
    return true;
  }

  async function _DB_UserAuthInit(tdb, data) {

    // 8位字符串, 包括小写字母, 数字
    let auth_code = mx.generateWords();
    let auth_time = mx.timestampS();
    let auth_hash = mx.crypto.sha1HashString(`${data.auth_id}_${mx.generateUUID()}_${auth_time}`);
    let auth_history = new Array<{}>();
    let auth_data:USER_AUTH_DATA_INIT = {
      user_id: data.user_id,
      user_nid: data.user_nid,
      auth_id: data.auth_id,
      ipaddress: data.ipaddress,
      device: data.device,
      code: auth_code,
      hash: auth_hash,
      time: auth_time,
      expired: 60*60*1,
      // 通用状态不包括历史记录
      history: auth_history
    };


    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    // 更新当前验证信息,状态置1
    let sql = `
      UPDATE t_auth SET user_nid = ?,
	      auth_ipaddress = ?, auth_region = NULL, auth_device=?, 
        auth_code=?, auth_hash=?, auth_used=?, auth_used_time=now(),
        auth_time=now(), auth_expired = DATE_ADD(now(), interval ? second), status = 1
        WHERE user_id = ? and auth_id = ?;
    `;
    let ret = await db.fragment(tdb, sql, [
      auth_data.user_nid,
      auth_data.ipaddress, auth_data.device, 
      auth_data.code, auth_data.hash, data.auth_used + 1, auth_data.expired,
      auth_data.user_id, auth_data.auth_id
    ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
    if(ret == false) {
      return false;
    }

    // 更新验证记录
    sql = `
    INSERT INTO t_history
      (auth_id, expired_time, auth_name, auth_code, auth_hash, auth_ipaddress, auth_region, auth_device, t_history.desc, t_history.status)
    VALUES
      (?, DATE_ADD(now(), interval ? second), ?, ?, ?, ?, NULL, ?, ?, ?)
    ;
    `;
    ret = await db.fragment(tdb, sql, [
      data.auth_id, auth_data.expired, data.user_account, 
      auth_data.code, auth_data.hash, auth_data.ipaddress, auth_data.device,
      "login", 2
    ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
    if(ret == false) {
      return false;
    }

    // 获取登录历史记录(最近五条)
    sql = `
    SELECT 
      create_time, auth_ipaddress, auth_region, auth_device
    FROM t_history
    WHERE 
      auth_id = ? and status = 2
    ORDER BY create_time DESC
    LIMIT 5;`;
    ret = await db.fragment(tdb, sql, [data.auth_id], 
      (err, res) => { error = err;  result = res.values; });
    if(ret == false) {
      return false;
    }

    auth_data.history.length = 0;
    if(result) {
      for(let i = 1; i < result.length; i ++) {
        auth_data.history.push({
          time: result[i].create_time,
          ipaddress: result[i].auth_ipaddress,
          region: result[i].auth_region,
          device: result[i].auth_device
        });
      }
    }

    return auth_data;
  }

  async function _DB_UserAuthExit(tdb, data) {
    //
    let auth_time = mx.timestampS();
    let auth_data:USER_AUTH_DATA_EXIT = {
      user_id: data.user_id,
      user_nid: data.user_nid,
      auth_id: data.auth_id,
      ipaddress: data.auth_ipaddress,
      device: data.auth_device,
      code: data.auth_code,
      hash: data.auth_hash,
      time: mx.timestampS(new Date(data.auth_time)),
      expired: data.auth_time_expired,
    };

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    // 更新当前验证信息
    // 必须验证code，相同才更新, 更新状态为0
    let sql = `
    UPDATE t_auth SET
      auth_used_time=now(), auth_expired = now(),
      status = 0
      WHERE user_id = ? and auth_id = ? and auth_code = ?;
    `;
    let ret = await db.fragment(tdb, sql, [
      auth_data.user_id, auth_data.auth_id, auth_data.code
    ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
    if(ret == false) {
      return false;
    }

    return auth_data;
  }

  // 
  async function _DB_UserDataGetWithToken(tdb, token_id, token_hash) {

    let result:any = null;
    let error:any = null;

    let sql = `
    SELECT 
      a.user_id, a.user_nid, a.user_nm, a.user_email, a.user_phone, a.user_pw, a.create_time AS user_createtime,
      b.auth_id, b.auth_code, b.auth_hash, b.auth_ipaddress, b.auth_region, b.auth_device, 
      b.activated, b.activated_time, b.auth_used, b.auth_time, b.auth_expired,
      b.shared_key,
      TIMESTAMPDIFF(SECOND, NOW(), b.auth_expired) AS auth_time_expired,
      a.privilege AS user_privilege_id
    FROM t_account a
    LEFT JOIN t_auth b
    ON
      b.user_id = a.user_id
    WHERE
      b.auth_id = ? and b.auth_hash = ?
      and a.status >= 1 and b.status >= 1;
    `;
    let ret = await db.fragment(tdb, sql, [
        token_id, token_hash
    ], (err, res) => { error = err; result = res.first; });
    if(ret == false || error || !result) {
        return false;
    }

    result.type_index = 2;
    result.user_pw = (result.user_pw || "").trim().toUpperCase();
    result.auth_hash = (result.auth_hash || "").trim().toUpperCase();
    result.type_name = "token";
    let temp:any = null;
    sql=`
    SELECT 
        a.privilege AS user_privilege_id, 
        IF(a.privilege > 0, TIMESTAMPDIFF(SECOND, NOW(), IF(isnull(a.privilege_expired), "${mx.defs.DATETIME_EXPIRED_MAX}", a.privilege_expired)), 
        IF(isnull(a.privilege_expired), 0, TIMESTAMPDIFF(SECOND, NOW(), a.privilege_expired))) AS privilege_time_expired,
        c.name AS privilege_name,
        c.level AS user_privilege_level,
        c.admin_level AS user_privilege_admin_level,
        c.allow_login AS privilege_allow_login,
        c.allow_notes AS privilege_allow_notes,
        c.allow_share AS privilege_allow_share,
        c.allow_favorites AS privilege_allow_favorites,
        c.allow_like AS privilege_allow_like,
        c.allow_commit AS privilege_allow_commit
    FROM t_account a 
    LEFT JOIN  t_privilege c
    ON
        a.privilege = c.id
    WHERE
        a.user_id = ? and a.user_nid = ? and a.status >= 1      
    ;
    `;
    ret = await db.fragment(tdb, sql, [
        result.user_id, result.user_nid
    ], (err, res) => { error = err; temp = res.first; });
    if(ret == false || error) {
        return false;
    }

    // 合并
    // ES5: Object.assign(result, temp);
    // ES6:
    result = {...result, ...temp};

    //
    return result;
  }

  export async function UserAuthToken(token, remote, server_options) { 
    // id and hash login
    if(!token) {
        return false;
    }
    let auth_token_id = token.id;
    let auth_token_hash = token.hash;
    if(mx.checkValueNull(auth_token_id) || mx.checkValueNull(auth_token_hash)) {
        return false;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;
    
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    result = await _DB_UserDataGetWithToken(db_query, auth_token_id, auth_token_hash);
    if(!result) {
      await db.rollback(db_query.query);
      if(result == null) {
        server_options.auth_result = mx.err.ERRORCODE_ACCESS_INVALID;
        server_options.auth_data = new database.Database.DBError(mx.err.ERRORCODE_ACCESS_INVALID, mx.err.ERROR_ACCESS_INVALID);
        return false;
      } else {
        server_options.auth_result = mx.err.ERRORCODE_ACCESS_ERROR;
        server_options.auth_data = error || new database.Database.DBError(mx.err.ERRORCODE_ACCESS_ERROR, mx.err.ERROR_ACCESS_ERROR);
        return false;
      }
    }

    if(result.auth_time_expired <= 0) {
        await db.rollback(db_query.query);
        server_options.auth_result = mx.err.ERRORCODE_ACCESS_EXPIRED;
        server_options.auth_data = new database.Database.DBError(mx.err.ERRORCODE_ACCESS_EXPIRED, mx.err.ERROR_ACCESS_EXPIRED);
        return false;
    }

    // 校验IP地址，确定通信域，存在伪装IP风险
    if(result.auth_ipaddress && result.auth_device && (!remote.ip || !remote.device)
        || mx_crypto.mx.md5HashString(result.auth_ipaddress) != mx_crypto.mx.md5HashString(remote.ip)
    //    || mx_crypto.mx.md5HashString(result.auth_device) != mx_crypto.mx.md5HashString(remote.device)
    ) {
        await db.rollback(db_query.query);
        server_options.auth_result = mx.err.ERRORCODE_ACCESS_EXPIRED;
        server_options.auth_data = new database.Database.DBError(mx.err.ERRORCODE_ACCESS_EXPIRED, mx.err.ERROR_ACCESS_EXPIRED);
        return false;
    }
    server_options.auth_data = result;

    // 验证通过时长增加1*60*60 秒
    let sql = `
        UPDATE t_auth SET
            auth_used = ?, auth_used_time=now(), auth_expired = DATE_ADD(now(), interval ? second)
        WHERE auth_id = ?;
    `;
    let ret = await db.fragment(db_query, sql, 
        [result.auth_used + 1, 60*60*1, result.auth_id], 
        (err, res) => { error = err; affectRowsCount = res.effect_count || -1;});
    if(ret == false || error ) {
        await db.rollback(db_query.query);
        server_options.auth_result = mx.err.ERRORCODE_ACCESS_ERROR;
        server_options.auth_data = error || new database.Database.DBError(mx.err.ERRORCODE_ACCESS_ERROR, mx.err.ERROR_ACCESS_ERROR);
        return false;
    }
    await db.commit(db_query.query);

    server_options.auth_result = 1;
    if(server_options.auth_data.user_privilege_level >= mx.defs.PRIVILEGE_LEVEL_USER) {
        server_options.auth_result = 2;
    }
    return true;
  }

  export function AuthDataGetWithPublic(data) {
    //
    delete data.type_index;
    delete data.type_name;

    //
    delete data.user_id;
    delete data.user_pw;
    delete data.user_privilege_id;
    delete data.privilege_name;
    delete data.privilege_time_expired;
    if(data.user_privilege_admin_level <= 0) {
      delete data.user_privilege_admin_level;
    }

    //
    delete data.auth_id;
    delete data.auth_code;
    delete data.auth_hash;
    delete data.auth_ipaddress;
    delete data.auth_device;
    delete data.auth_region;
    //delete data.auth_expired;
    //delete data.auth_time;
    //delete data.auth_used;
    //delete data.auth_time_expired;

    //
    return data;
  }

  // 此处公开只针对用户自身
  export function UserDataGetWithPublic(data) {
    //
    delete data.type_index;
    delete data.type_name;

    //
    delete data.user_id;
    delete data.user_pw;
    delete data.user_privilege_id;
    delete data.privilege_name;
    delete data.privilege_time_expired;
    if(data.user_privilege_admin_level <= 0) {
      delete data.user_privilege_admin_level;
    }

    //
    delete data.auth_id;
    delete data.auth_code;
    delete data.auth_hash;
    delete data.auth_ipaddress;
    delete data.auth_device;
    delete data.auth_region;
    delete data.auth_expired;
    //delete data.auth_time;
    delete data.auth_used;
    delete data.auth_time_expired;

    //
    if(data.auth_data) {
      data.auth_data.user_id && delete data.auth_data.user_id;
    }
    return data;
  }

  // 公开将对任何人可见
  export function UserDataGetWithPublicAny(data) {
    // 首先。需要符合自身可见
    let result = UserDataGetWithPublic(data);

    result.user_lasttime = result.auth_time;
    delete result.auth_time;

    // 删除针对自身的一些数据
    delete result.activated;
    delete result.activated_time;
    delete result.verified_phone;
    delete result.verified_phone_time;
    delete result.verifying_phone;
    delete result.verifying_phone_time;
    delete result.verified_email;
    delete result.verified_email_time;
    delete result.verifying_email;
    delete result.verifying_email_time;
    delete result.shared_key;
    delete result.api_key;

    if(result.user_nick) {
      delete result.user_nm;
    }

    // 
    if((result.user_public_level & 0x01) == 0) {
      if(result.user_email) {
        result.user_email = mx.mask2String(result.user_email, 2, 6);
      }
    } 
    if((result.user_public_level & 0x02) == 0) {
      if(result.user_phone) {
        result.user_phone = mx.mask2String(result.user_phone, 3, 2);
      }
    } 
    return result;
  }

  //
  export async function UserGetVerifyingData(data:any) {
    //
    if(/^[1-9][0-9]{4,16}$/g.test(data.token_id) === false ||
      /^[0-9a-zA-Z]{16,64}$/g.test(data.token_hash) === false) {
        return new database.Database.DBError(-101, `Authentication information is unavailable`);
    }

    //查询历史验证信息
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    // 获取历史记录
    let  sql = `
    SELECT 
    id AS auth_uid, auth_id, create_time, expired_time,
      TIMESTAMPDIFF(SECOND, NOW(), IF(isnull(expired_time), "${mx.defs.DATETIME_EXPIRED_MAX}", expired_time)) AS auth_expired,
      auth_name, auth_code, auth_hash,
      auth_ipaddress, auth_region, auth_device
    FROM t_history
    WHERE 
      auth_id = ? AND auth_hash = ?
      AND status = 0
    LIMIT 1;
    `;
    let ret = await db.fragment(db_query, sql, 
      [data.token_id, data.token_hash], 
      (err, res) => { error = err;  result = res.first; });
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-2, "Internal Unknow Error");
    }
    if(!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-102, `Authentication information is not exist or invalid`);
    }

    let auth_record = result;

    // 邮箱验证
    if(data.type_index == 0 || data.type_index == 1 || data.type_index == 2) {
      sql = `
      SELECT 
        auth_id, user_id, user_nid,
        activated, activated_time, 
        verified_email, verified_email_time, verifying_email, verifying_email_time
      FROM t_auth
      WHERE
        verifying_email = ? AND auth_id = ?
      LIMIT 1;
      `;
      ret = await db.fragment(db_query, sql, 
        [auth_record.auth_uid, auth_record.auth_id], 
        (err, res) => { error = err;  result = res.first; });
      if(ret == false) {
        await db.rollback(db_query.query);
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    }

    if(!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-102, `Authentication information is not exist or invalid`);
    }

    auth_record = {...auth_record, ...result};
    if(auth_record.auth_expired <= 0) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-103, `Authentication information is out of date`);
    }

    //
    await db.commit(db_query.query);

    //
    auth_record.type_index = data.type_index;
    auth_record.type_name = data.type_name;
    return auth_record;
  }

  //
  async function _DB_UserGetVerifyingData(index:number, auth_data:any) {

    //查询历史验证信息
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    // 获取
    let sql = `
    SELECT 
      auth_id, user_id, user_nid,
      activated, activated_time, 
      verified_email, verified_email_time, verifying_email, verifying_email_time,
      verified_phone, verified_phone_time, verifying_phone, verifying_phone_time
    FROM t_auth
    WHERE
      (1 = ? AND auth_id = ?) OR
      (2 = ? AND auth_id = ?)
    LIMIT 1;
    `;
    let ret = await db.fragment(db_query, sql, 
      [
        index, auth_data.auth_id, 
        index, auth_data.auth_id
      ], (err, res) => { error = err;  result = res.first; });
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-2, "Internal Unknow Error");
    }

    let auth_record = result;

    if(index == 1) {
      delete auth_record.verified_phone;
      delete auth_record.verified_phone_time;
      delete auth_record.verifying_phone;
      delete auth_record.verifying_phone_time;

    } else if(index == 2) {
      delete auth_record.verified_email;
      delete auth_record.verified_email_time;
      delete auth_record.verifying_email;
      delete auth_record.verifying_email_time;

    }
  
    sql = `
    SELECT 
    id AS auth_uid, auth_id, create_time, expired_time,
      TIMESTAMPDIFF(SECOND, NOW(), IF(isnull(expired_time), "${mx.defs.DATETIME_EXPIRED_MAX}", expired_time)) AS auth_expired,
      auth_name, auth_code, auth_hash,
      auth_ipaddress, auth_region, auth_device
    FROM t_history
    WHERE 
      (1 = ? AND id = ? AND auth_id = ?) OR
      (2 = ? AND id = ? AND auth_id = ?)
      AND status = 0
    LIMIT 1;
    `;
    ret = await db.fragment(db_query, sql, 
      [
        index, auth_record.verifying_email, auth_record.auth_id, 
        index, auth_record.verifying_phone, auth_record.auth_id
      ], (err, res) => { error = err;  result = res.first; });
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-2, "Internal Unknow Error");
    }
    if(!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-102, `Authentication information is not exist or invalid`);
    }

    auth_record = {...auth_record, ...result};

    //
    await db.commit(db_query.query);

    //
    return auth_record;
  }

  //
  export function VerifyingDataGetWithPublic(data) {
     //
     delete data.user_id;
     delete data.auth_uid;
     delete data.create_time;
     delete data.expired_time;
     delete data.auth_code;
     delete data.auth_hash;
     delete data.auth_region;
     //delete data.auth_ipaddress;
     //delete data.auth_device;
     return data;
  }

  //
  export async function UserSendVerifyingEmail(auth_data, verifying_data) {
    //查询历史验证信息
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    let account = {
      uid:auth_data.user_id,
      number:auth_data.user_nid,
      name:auth_data.user_nm,
      email:auth_data.user_email,
      phone:"",
      current:auth_data.user_email,
      type_index:mx.defs.ACCOUNT_TYPE_EMAIL,
      type_name:mx.defs.ACCOUNT_TYPENAME_EMAIL,
    };

    result = await _DB_UserDataGet(db_query, 90, account);
    if(!result) {
      await db.rollback(db_query.query);
      if(result == null) {
        return new database.Database.DBError(-102, "Account not exist");
      } else {
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    }

    //
    let user_data = result;
    user_data.ipaddress = auth_data.auth_ipaddress;
    user_data.device = auth_data.auth_device;

    // 被封的账号无法操作
    if(user_data.user_privilege_level == mx.defs.PRIVILEGE_LEVEL_BANNED) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-107, "Account banned");
    } else if(user_data.user_privilege_level >= mx.defs.PRIVILEGE_LEVEL_REGISTERED) {
      // nothing
    } else {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-103, "Account invalid");
    }

    // 发送注册认证信息
    let activate = false;
    if(user_data.activated == 0) {
      activate = true;
    }
    let ret = await _DB_UserVerifying(db_query, account.type_index, user_data, activate);
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-108, "Verifying Unknow Error");
    }

    let sql = ``;
    if(user_data.verifying_email > 0) {
      sql = `
      UPDATE t_history SET
        expired_time = NULL, used_time = NULL, status = 1
      WHERE id = ? and auth_id = ?;
      `;
      ret = await db.fragment(db_query, sql, [
        user_data.verifying_email, user_data.auth_id
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
      if(ret == false) {
        await db.rollback(db_query.query);
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    }

    //
    await db.commit(db_query.query);

    result = await _DB_UserGetVerifyingData(1, auth_data);
    return result;
  }

  // 
  export async function UserActivateAccount(data) {

    //查询历史验证信息
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    let account = {
      uid:data.user_id,
      number:data.user_nid,
      name:"",
      email:"",
      phone:"",
      current:"",
      type_index:-1,
      type_name:"",
    };
    result = await _DB_UserDataGet(db_query, 90, account);
    if(!result) {
      await db.rollback(db_query.query);
      if(result == null) {
        return new database.Database.DBError(-102, "Account not exist");
      } else {
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    }

    let user_data = result;
    console.info(data);

    // 被封的账号无法操作
    if(user_data.user_privilege_level == mx.defs.PRIVILEGE_LEVEL_BANNED) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-107, "Account banned");
    } else if(user_data.user_privilege_level >= mx.defs.PRIVILEGE_LEVEL_REGISTERED) {
      // nothing
    } else {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-103, "Account not activate");
    }

    // 更新验证
    let  sql = ``;
    if(data.type_index == 0) {

      // 认证完成后, 将认证时间置空
      sql = `
      UPDATE t_auth SET
        verified_email=?, verified_email_time=NOW(), verifying_email_time = NULL, verifying_email = 0
      WHERE user_id = ? and auth_id = ?;
      `;
      let ret = await db.fragment(db_query, sql, [
        data.verifying_email, data.user_id, data.auth_id
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
      if(ret == false) {
        await db.rollback(db_query.query);
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    } else if(data.type_index == 1 && user_data.user_privilege_level == mx.defs.PRIVILEGE_LEVEL_REGISTERED) {
      // 激活账号

      // 如果已经认证，将不能重复认证
      if(data.activated > 0) {
        await db.rollback(db_query.query);
        return new database.Database.DBError(-103, `Account authentication exist`);
      }

      sql = `
      UPDATE t_auth SET
        activated = ?, activated_time=NOW(), verified_email=?, verified_email_time=NOW(), verifying_email_time = NULL, verifying_email = 0
      WHERE user_id = ? and auth_id = ?;
      `;
      let ret = await db.fragment(db_query, sql, [
        data.verifying_email, data.verifying_email, data.user_id, data.auth_id
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
      if(ret == false) {
        await db.rollback(db_query.query);
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }

      // 设置用户权限
      sql = `
      UPDATE t_account SET
        privilege = (SELECT id FROM t_privilege WHERE level = ? AND status = 1 LIMIT 1),
        privilege_expired = NULL
      WHERE user_id = ? and user_nid = ?;
      `;
      ret = await db.fragment(db_query, sql, [
        mx.defs.PRIVILEGE_LEVEL_USER, data.user_id, data.user_nid
      ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
      if(ret == false) {
        await db.rollback(db_query.query);
        console.info(ret, error);
        return new database.Database.DBError(-2, "Internal Unknow Error");
      }
    } else {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-2, "Internal Unknow Error");
    }

    // 完成后, 将该条记录标记为已经使用
    sql = `
    UPDATE t_history SET
      used_time = NOW(), status = 1
    WHERE id = ? and auth_id = ? and auth_code = ?;
      `;
    let ret = await db.fragment(db_query, sql, [
        data.auth_uid, data.auth_id, data.auth_code
    ], (err, res) => { error = err; affectRowsCount = res.effect_count || -1; });
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-2, "Internal Unknow Error");
    }

    await db.commit(db_query.query);
    return true;
  }

  // 验证玛1分钟内有效，暂定：每次使用完验证码不销毁，只有超时才销毁
  export async function Check_AuthCode(ctx) {
    let cache = await redis.Cache_GetInstance();
    if(!cache|| !ctx.remote.device_idx) {
      return false;
    }

    let auth_key = `AUTH_CODE_${ctx.remote.device_idx}`;
    let auth_value:boolean|any = await cache.get(auth_key);
    if (auth_value == false || auth_value instanceof Error) {
      return false;
    } else if (auth_value == null || !(auth_value = JSON.parse(auth_value))) {
      return new database.Database.DBError(-1, "Auth Code error");
    } else if ((auth_value.time + 60 * 1000) < mx.timestampMS()) {
      return new database.Database.DBError(-1, "Auth Code timeout");
    } else if (ctx.method == "GET" && ctx.query.auth_code && auth_value.value == ctx.query.auth_code.trim().toUpperCase()) {
      ctx.query.auth_code = auth_value.value;
    } else if (ctx.method == "POST" && ctx.body.auth_code && auth_value.value == ctx.body.auth_code.trim().toUpperCase()) { 
      ctx.body.auth_code = auth_value.value;
    } else {
      return new database.Database.DBError(-1, "Auth Code not match");
    }
    // 此处应该处理销毁验证码
    //
    return true;
  }


  // 
  export async function UserPublicData(auth_data, public_data) {
    //
    if(!mx.checkAccountNumber(public_data.user_nid)) {
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
    }

    //
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;

    let account = {
      uid:public_data.user_id,
      number:public_data.user_nid,
      name:"",
      email:"",
      phone:"",
      current:"",
      type_index:-1,
      type_name:"",
    };
    result = await _DB_UserDataGet(db_query, 99, account);
    if(!result) {
      await db.rollback(db_query.query);
      if(result == null) {
        return new database.Database.DBError(-102, "Account not exist");
      } else {
        return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
      }
    }

    let user_data = result;

    user_data.is_editor = false;
    if(auth_data) {
      if(auth_data.user_uid == user_data.user_uid && auth_data.user_nid == user_data.user_nid) {
        user_data.is_editor = true;
      }
    }

    result = await _DB_UserDataDetailGet(db_query, user_data, auth_data);
    if(!result) {
      await db.rollback(db_query.query);
      if(result == null) {
        return new database.Database.DBError(-102, "Account not exist");
      } else {
        return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
      }
    }
    user_data = { ...user_data, ...result };


    //
    await db.commit(db_query.query);
    return user_data;
  }

  async function _DB_ProfileEditing(tdb, auth_data, profile_data) {

    //
    let result:any = null;
    let error:any = null;
    let effectRowsCount:number = -1;

    // 更新当前验证信息
    // 必须验证code，相同才更新, 更新状态为0
    let sql = `
    UPDATE t_account SET
      user_nm = ?
      WHERE user_id = ? and user_nid = ? and status >= 1
    `;
    let ret = await db.fragment(tdb, sql, [
      profile_data.account_name,
      auth_data.user_id, auth_data.user_nid
    ], (err, res) => { error = err; effectRowsCount = res.effect_count || -1; });
    if(ret == false || effectRowsCount < 0) {
      return false;
    }
    
    // 发生改变，添加进记录
    let uid = -1;
    if(effectRowsCount > 0) {
      sql = `
      INSERT INTO t_history
        (auth_id, expired_time, auth_name, auth_code, auth_hash, auth_ipaddress, auth_region, auth_device, 
        value, t_history.desc, t_history.status)
      VALUES
        (?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
      ;
      `;
      ret = await db.fragment(tdb, sql, [
        auth_data.auth_id, auth_data.user_nm, 
        auth_data.auth_code, auth_data.auth_hash, auth_data.auth_ipaddress, auth_data.auth_device,
        profile_data.account_name,
        "changed_user_nm", 10
      ], (err, res) => { error = err; effectRowsCount = res.effect_count || -1; uid = res.first.insertId; });
      if(ret == false || effectRowsCount < 0 || uid < 0) {
        return false;
      }
    }

    let regions = XRegionToAny(profile_data.region || "");
    let country = regions.country;
    let region = regions.region;

    // 更新用户基本属性
    sql = `
    UPDATE t_user SET
      nickname = ?, gender = ?, age = ?, country = ?, region = ?,
      update_time = NOW()
      WHERE user_id = ? and user_nid = ? and auth_id = ?
    `;
    ret = await db.fragment(tdb, sql, [
      profile_data.nick_name, profile_data.gender, profile_data.age, country, region,
      auth_data.user_id, auth_data.user_nid, auth_data.auth_id,
    ], (err, res) => { error = err; effectRowsCount = res.effect_count || -1; });
    if(ret == false || effectRowsCount < 0) {
      return false;
    }

    // 发生改变，添加进记录
    uid = -1;
    if(effectRowsCount > 0) {
      sql = `
      INSERT INTO t_history
        (auth_id, expired_time, auth_name, auth_code, auth_hash, auth_ipaddress, auth_region, auth_device, 
        value, t_history.desc, t_history.status)
      VALUES
        (?, NULL, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
      ;
      `;
      ret = await db.fragment(tdb, sql, [
        auth_data.auth_id, auth_data.user_nm, 
        auth_data.auth_code, auth_data.auth_hash, auth_data.auth_ipaddress, auth_data.auth_device,
        `${profile_data.nick_name}; ${profile_data.age}; ${profile_data.region}`,
        "changed_profile", 12
      ], (err, res) => { error = err; effectRowsCount = res.effect_count || -1; uid = res.first.insertId; });
      if(ret == false || effectRowsCount < 0 || uid < 0) {
        return false;
      }
    }

    return true;
  }

  // 用户编辑属性
  export async function ProfileEditing(auth_data, profile_data) {
    //
    if(!mx.checkAccountNumber(profile_data.user_nid)) {
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
    }
    
    // 必须登录，验证ID和用户ID一致
    if(!auth_data || auth_data.user_nid != profile_data.user_nid) {
        return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
    }
    
    // 校验账号和昵称
    if(!profile_data.account_name || profile_data.account_name.length == 0) { profile_data.account_name = null; }
    else {
      profile_data.account_name = profile_data.account_name.trim();
      let rv = mx.checkAccountName(profile_data.account_name, 6, mx.defs.ACCOUNT_NAME_MAXLEN);
      if(!rv) {
        return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
      }
      profile_data.account_name = rv;
    }

    if(!profile_data.nick_name || profile_data.nick_name.length == 0) { profile_data.nick_name = null; }
    else {
      profile_data.nick_name = profile_data.nick_name.trim();
      let rv = mx.checkNickName(profile_data.nick_name, 6, mx.defs.ACCOUNT_NAME_MAXLEN);
      if(!rv) {
        return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
      }
      profile_data.nick_name = rv;
    }

    if(profile_data.region && mx.checkSafetyCharacters(profile_data.region, 2)) {
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_INVALID, mx.err.ERROR_OPERATION_INVALID);
    }

    if(!profile_data.account_name) {
      profile_data.account_name = `mid${auth_data.user_nid}`;
    }
    if(!profile_data.age) {
      profile_data.age = 0;
    }
    console.info(auth_data, profile_data);

    //
    let result:any = null;
    let error:any = null;
    let affectRowsCount:number = -1;
  
    let db_query = await db.begin();
    if(db_query.err) {
      return db_query.err;
    }

    // 无论是否标识为已删除，都不能重复
    let sql = `
    SELECT 
      user_nid, user_nm, user_email, user_phone, create_time
    FROM t_account a
    WHERE
      a.user_nm = ? and NOT( user_id = ? and user_nid = ?)
    ;
    `;
    let ret = await db.fragment(db_query, sql, [ 
      profile_data.account_name, 
      auth_data.user_id, auth_data.user_nid,
    ], (err, res) => { error = err; result = res.first; });
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
    }
    if(result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-102, "Account already exist");
    }

    // 昵称是唯一的，不可以重复
    sql = `
    SELECT 
      user_id, user_nid, nickname AS user_nick, create_time
    FROM t_user u
    WHERE
      u.nickname = ? and NOT( u.user_id = ? and u.user_nid = ?)
    ;
    `;
    ret = await db.fragment(db_query, sql, [ 
      profile_data.nick_name, 
      auth_data.user_id, auth_data.user_nid,
    ], (err, res) => { error = err; result = res.first; });
    if(ret == false) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
    }
    if(result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(-102, "Nickname already exist");
    }


    //
    result = await _DB_ProfileEditing(db_query, auth_data, profile_data);
    if (!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
    }
    
    let account = {
      uid:auth_data.user_id,
      number:auth_data.user_nid,
      name:"",
      email:"",
      phone:"",
      current:"",
      type_index:-1,
      type_name:"",
    };

    result = await _DB_UserDataGet(db_query, 1, account);
    if(!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(mx.err.ERRORCODE_OPERATION_ERROR, mx.err.ERROR_OPERATION_ERROR);
    }
    let user_data = result;

    // 获取详细用户属性
    result = await _DB_UserDataDetailGet(db_query, user_data, auth_data);
    if(!result) {
      await db.rollback(db_query.query);
      return new database.Database.DBError(mx.err.ERRORCODE_INTERNAL, mx.err.ERROR_INTERNAL);
    }

    user_data = { ...user_data, ...result };

    //
    await db.commit(db_query.query);


    return user_data;
  }
}