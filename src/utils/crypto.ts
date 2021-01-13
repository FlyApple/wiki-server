import * as crypto from "crypto";


export class mx {

    //
    public static CRYPTO_KEY_IV = "0123456789012345";

    //
    public static bufferHexString = (buffer:Buffer) => {
        // let r = "";
        // for(let i = 0; i < buffer.length; i ++) {
        //     let v = `00${buffer[i].toString(16).toUpperCase()}`;
        //     r = r + v.substr(v.length - 2, 2);
        // }
        return buffer.toString("hex").toUpperCase();
    } 

    // BASE64:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
    // URL:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-
    public static base64Encode = (value:Buffer, urlencode?:boolean) : string => {
        let result = value.toString("base64");
        if(urlencode) {
            result = result.replace(/\+/g, "_");
            result = result.replace(/\//g, "-");
            result = result.replace(/=/g, "");
        }
        return result;
    }

    public static base64Decode = (value:string, urldecode?:boolean) : Buffer=> {
        if(urldecode) {
            value = value.replace(/_/g, "+");
            value = value.replace(/\-/g, "\/");
            let count = value.length % 3;
            if(count == 2) {
                value = value + "==";
            } else if(count == 1) {
                value = value + "=";
            }
        }
        return Buffer.from(value, "base64");
    }

    public static base64EncodeString = (value:string, urlencode?:boolean) : string => {
        let result = Buffer.from(value, "utf8");
        return mx.base64Encode(result, urlencode);
    } 

    public static base64DecodeString = (value:string, urldecode?:boolean) : string => {
        let result = mx.base64Decode(value, urldecode);
        return result.toString("utf8");
    } 

    //
    public static md5Hash = (value)  => {
        let hash = crypto.createHash("md5");
        hash.update(value, "utf8");
        return hash.digest();
    };

    public static sha1Hash = (value)  => {
        let hash = crypto.createHash("sha1");
        hash.update(value, "utf8");
        return hash.digest();
    };

    public static sha256Hash = (value)  => {
        let hash = crypto.createHash("sha256");
        hash.update(value, "utf8");
        return hash.digest();
    };

    public static md5HashString = (value)  => {
        return mx.bufferHexString(mx.md5Hash(value));
    };

    public static sha1HashString = (value)  => {
        return mx.bufferHexString(mx.sha1Hash(value));
    };

    public static sha256HashString = (value)  => {
        return mx.bufferHexString(mx.sha256Hash(value));
    };

    //AES-256
    public static aes256Encrypt = (key:string, value:Buffer) : Buffer => {
        let key_value = Buffer.from(key, "utf8");
        let iv_value =Buffer.from(mx.CRYPTO_KEY_IV, "utf8");
        let cipher = crypto.createCipheriv("aes-256-gcm", key_value, iv_value);
        cipher.update(value);
        let result = cipher.final();
        return result;
    }

    public static aes256Decrypt = (key:string, value:Buffer) : Buffer => {
        let key_value = Buffer.from(key, "utf8");
        let iv_value =Buffer.from(mx.CRYPTO_KEY_IV, "utf8");
        let cipher = crypto.createDecipheriv("aes-256-gcm", key_value, iv_value);
        cipher.update(value);
        let result = cipher.final();
        return result;
    }

    //Buffer to base64
    public static aes256EncryptString = (key:string, value:Buffer|string, urlencode?:boolean) : string => {
        if(typeof value == "string" || value instanceof String) {
            value = Buffer.from(value as string, "utf8");
        }
        let buffer = mx.aes256Encrypt(key, value);
        return mx.base64Encode(buffer, urlencode);
    }

    public static aes256DecryptString = (key:string, value:string, urldecode?:boolean) : string => {
        let buffer = mx.base64Decode(value, urldecode);
        buffer = mx.aes256Decrypt(key, buffer);
        return buffer.toString("utf8");
    }
}

//
export default mx;