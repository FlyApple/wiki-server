//
import mx_define from "./define";
import mx_text from "./text";
import mx_error from "./error";
import mx_crypto from "./crypto";
import mx_compress from "./compress";


import { SpecialCharacters } from "./special"


export class mx {
    //
    public static defs = mx_define;
    public static txt = mx_text;
    public static err = mx_error;
    public static compress = mx_compress;
    public static crypto = mx_crypto;

    //
    public static generateRandom = (min, max) => {
        return Math.round(Math.random() * (max - min)) + min;
    };

    // 按最大64位长度转换
    // 增加符号
    public static numberFormat = (n, x, y = 0, radix = 10) => {
        if(radix == 16) {
            let v = n.toString(16).toUpperCase();
            x = x == undefined || x <= 0 ? 0 : (x > 19 ? 19 : x);
            v = `0000000000000000000${v}`;
            v = x > 0 && x < v.length ? v.substring(v.length - x, v.length) : v;
            return v;
        } 

        let v = `${n.toFixed(y)}`.replace(/-/g, "");
        x = x == undefined || x <= 0 ? 0 : (x > 19 ? 19 : x);
        v = x > 0 ? v = `0000000000000000000${v}` : v;
        v = x > 0 && x < v.length ? v.substring(v.length - x, v.length) : v;
        return n < 0 ? `-${v}` : v;
    }

    // 格式化数值1 000 000 000 000 000，双精度表示15-16位
    // AA.BBx
    // 1百 hundred, 1千 thousand, 100万 million, 十亿 billion, 一万亿 trillion, 1000万亿 quadrillion
    public static number2String = (n:number) : string => {
        if(!n || n == 0) { return ""; }
        let v = n * 0.001; 
        if((v >= 1 && v <= 999) || (v <= -1 && v >= -999)) { return `${v.toFixed(2)}k`; } v = v * 0.001;    //1千
        if((v >= 1 && v <= 999) || (v <= -1 && v >= -999)) { return `${v.toFixed(2)}m`; } v = v * 0.001;    //100万
        if((v >= 1 && v <= 999) || (v <= -1 && v >= -999)) { return `${v.toFixed(2)}b`; } v = v * 0.001;    //10亿
        if((v >= 1 && v <= 999) || (v <= -1 && v >= -999)) { return `${v.toFixed(2)}t`; } v = v * 0.001;    //1万亿
        if((v >= 1 && v <= 999) || (v <= -1 && v >= -999)) { return `${v.toFixed(2)}q`; } v = v * 0.001;    //1000万亿
        return `${n.toString()}`;
    }

    //
    public static timestampMS = (dt?:Date) => {
        return dt ? Math.round(dt.getTime()) : Math.round(Date.now());
    }

    public static timestampS = (dt?:Date) => {
        return Math.round(mx.timestampMS(dt) / 1000);
    }

    public static timestamp2DatetimeMS = (tt) : Date => {
        return new Date(tt);
    }

    public static timestamp2DatetimeS = (tt) : Date => {
        return mx.timestamp2DatetimeMS(tt * 1000);
    }

    //
    public static datetimeMax = () => {
        return new Date("2099-01-01");
    }
    
    // 格式化时间(秒)
    public static datetimeFormat = (v:number|Date|null, ymd = true, hms = true, ms = false) => {
        let dt:Date;
        if(v instanceof Number || typeof(v) == "number") {
            let n:number = v as number;
            dt = new Date(ms ? n : (n * 1000));
        } else {
            dt = (v || new Date()) as Date;
        }

        let rv = "";
        if(dt) {
            rv = !ymd ? "" : `${mx.numberFormat(dt.getFullYear(),4)}-${mx.numberFormat(dt.getMonth() + 1,2)}-${mx.numberFormat(dt.getDate(),2)}`;
            rv = rv + (!hms ? "" : ` ${mx.numberFormat(dt.getHours(),2)}:${mx.numberFormat(dt.getMinutes(),2)}:${mx.numberFormat(dt.getSeconds(),2)}`);
            rv = rv + (!ms ? "": `:${dt.getMilliseconds()}`);
        }
        return rv;
    }

    // v = v0 - v1;
    public static datetime2DiffString = (v0:Date|number, v1:Date|number) => {
        let t0:Date, t1:Date;
        if(v0 instanceof Number || typeof(v0) == "number") {
            let n:number = v0 as number; t0 = new Date(n * 1000);
        } else {
            t0 = v0;
        }
        if(v1 instanceof Number || typeof(v1) == "number") {
            let n:number = v1 as number; t1 = new Date(n * 1000);
        } else {
            t1 = v1;
        }

        let tms = t0.getTime() - t1.getTime();
        let ts = tms / 1000;
        let value = `${t1.toDateString()} ${mx.numberFormat(t1.getHours(),2)}:${mx.numberFormat(t1.getMinutes(),2)}`;
        if(ts < 60) {
            value = "A minute ago";
        } else if (ts < 60 * 10) {
            value = "10 minute ago";
        } else if (ts < 60 * 30) {
            value = "30 minute ago";
        } else if (ts < 60 * 60) {
            value = "A hour ago";
        } else if (ts < 60 * 60 * 3) {
            value = "3 hour ago";    
        } else if (ts < 60 * 60 * 5) {
            value = "5 hour ago";  
        } else if (ts < 60 * 60 * 8) {
            value = "8 hour ago";  
        } else if (ts < 60 * 60 * 10) {
            value = "10 hour ago";  
        } else if (ts < 60 * 60 * 15) {
            value = "15 hour ago"; 
        } else if (ts < 60 * 60 * 20) {
            value = "20 hour ago";    
        } else if (ts < 60 * 60 * 24) {
            value = "A day ago";    
        } else if (ts < 60 * 60 * 24 * 2) {
            value = "2 day ago";    
        } else if (ts < 60 * 60 * 24 * 3) {
            value = "3 day ago";    
        }
        return value;
    }

    // 合并两个url
    public static joinURLs = (ln: boolean,...paths: string[]) : string => {
        let result = "";
        let count = paths.length;
        paths.forEach((v, i) => {
            result = `${result}${v}${(ln || i + 1 < count) && !v.endsWith("/") ? "/": ""}`;
        });
        return result;
    }
    public static joinURLArgs = (url: string,...args: string[]) : string => {
        let result = url;
        let count = args.length;
        args.forEach((v, i) => {
            if(result.indexOf("?") < 0) {
                result = `${result}?`;
            } else if(!result.endsWith("?") && !result.endsWith("&")) {
                result = `${result}&`;
            }
            result = `${result}${v}${i + 1 < count ? "&" : ""}`;
        });
        return result;
    }

    // 字母中不包含歧义字符：ilIL皆为数字1, oO皆为数字0
    // 默认全部小写
    public static generateWords = (upper = false) => {
        let words = "0123456789";
        if(!upper) {
            words = `${words}abcdefghjkmnpqrstuvwxyz`;
        } else {
            words = `${words}ABCDEFGHJKMNPQRSTUVWXYZ`;
        }
        let count = words.length;
        let rand1 = mx.generateRandom(100000, 999999);
        let rand2 = mx.generateRandom(100000, 999999);
        let A1 = words.charAt(rand1 % count); rand1 = Math.round(rand1 / count);
        let A2 = words.charAt(rand1 % count); rand1 = Math.round(rand1 / count);
        let A3 = words.charAt(rand1 % count); rand1 = Math.round(rand1 / count);
        let A4 = words.charAt(rand1 % count); rand1 = Math.round(rand1 / count);
        let B1 = words.charAt(rand2 % count); rand2 = Math.round(rand2 / count);
        let B2 = words.charAt(rand2 % count); rand2 = Math.round(rand2 / count);
        let B3 = words.charAt(rand2 % count); rand2 = Math.round(rand2 / count);
        let B4 = words.charAt(rand2 % count); rand2 = Math.round(rand2 / count);
        return `${A1}${A2}${A3}${A4}${B1}${B2}${B3}${B4}`;
    };

    // 0：默认6位数字
    // 1：8位字母及数字
    // 7: 生成交易流水ID
    public static generateUID = (type = 0, args = null) => {
        if (type == 1) {
            return mx.generateWords();
        } else if (type == 2) {
            return mx.generateWords(true);
        } else if (type == 3) {
            return mx.generateAccountNumber(6, 9);
        } else if (type == 4) {
            return mx.generateAccountNumber(6, 9, false);
        } else if (type == 7) {
            return mx.generateTransactionID(args);
        }
        return mx.generateRandom(100000, 999999);
    }

    // 随机数字ID, 默认不过滤靓号
    // 出现4个0，4个1，3个6，4个7，3个8，3个9定义为靓号
    public static generateAccountNumber = (min, max, excellent = true) => {
        if(min < 4) { min = 4; }
        if(max > 12) { max = 12; }
        let nid = null; let count = 0;
        while (nid == null) {
            let rand1 = mx.generateRandom(100000, 999999).toString();
            let rand2 = mx.generateRandom(100000, 999999).toString();
            let rid = rand1;
            if(rid.length < max) {
                rid = `${rid}${rand2}`.substring(0, max);
            }
            let bits = mx.generateRandom(min, max);
            rid = rid.substring(0, bits);
            if(excellent) {
                nid = rid;
                break;
            } else if(!excellent && /^\d*((0){4}|(1){4}|(6){3}|(7){4}|(8){3}|(9){3})\d*$/g.test(rid) == false) {
                nid = rid;
                break;
            } else if(count >= 10) {
                nid = rid;
                break;
            }
            count ++;
        }
        return nid;
    };

    public static checkValueNull = (value, checksize = true) => {
        if(value === undefined || value === null) { return true; }
        if(checksize) {
            if((value instanceof String || typeof(value) === "string") && value.length === 0) { return true; }
            if((value instanceof Array) && value.length === 0) { return true; }
        }
        return false;
    }

    // null值不以敏感字符处理
    // 除了_-全部符号视作敏感字符
    // 0 ：默认,
    // 1 : 检测字符[],(),<>.{}
    // 2 : +,-,=
    public static checkSafetyCharacters = (value, level = 0) => {
        if(mx.checkValueNull(value)) { return false; }
        if(/[!@#$%^&*:;'"?~`,./\\|]/g.test(value)) {
            return true;
        }
        if(level >= 1 && /[[\]()<>{}]/g.test(value)) {
            return true;
        }
        if(level >= 2 && /[+\-=_ ]/g.test(value)) {
            return true;
        }
        if(level >= 10 && /[·~！@#￥%……&*、‘”？：；，。]/g.test(value)) {
            return true;
        }
        if(level >= 11 && /[【】（）《》]/g.test(value)) {
            return true;
        }
        if(level >= 12 && /[——]/g.test(value)) {
            return true;
        }
        if(level >= 20) {
            let special_chars = SpecialCharacters;
            let result = false;
            for(let i = 0; i < value.length; i ++) {
                let cc = (value as string).charAt(i);
                if(special_chars.indexOf(cc, 0) >= 0) {
                    result = true; break;
                }
            }
            return result;
        }
        return false;
    }

    public static checkUUID = (value) => {
        if(mx.checkValueNull(value)) { return false; }
        if(/^[0-9a-zA-Z]{8}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{4}-[0-9a-zA-Z]{12}$/g.test(value)) {
            return true;
        }
        return false;
    }

    public static checkEmail = (email) : string|boolean => {
        if (mx.checkValueNull(email)) { return false; }
        if(/^[0-9|a-z|A-Z|_|\-|.]+@[a-zA-Z0-9._-]+$/g.test(email) === false) {
            return false;
        }
        return email;
    }

    public static checkPhone = (phone) : any|boolean => {
        if (mx.checkValueNull(phone)) { return false; }
        
        phone = phone.replace(/\s/g, "");
        //CHN: +86 11 (xxx aaaa bbbb)digits
        if(/^(\+86)?1[3456789][0-9]\d{8}$/g.test(phone)) {
            let v = phone.match(/1[3456789][0-9]\d{8}$/g);
            v = v && v[0] ? v[0] : undefined; 
            return {code:"86", number:v || phone};
        }
        return false;
    }

    // 账号必须出现字母
    public static checkAccountName = (name, min = 6, max = 16) : string|boolean => {
        if (mx.checkValueNull(name)) { return false; }
        
        name = name.trim();
        if(name.length < min || name.length >= max || 
           /^(([0-9])*([a-zA-Z])+([0-9])*)+$/g.test(name) === false) {
            return false;
        }
        return name;
    }

    public static checkAccountNameX = (name) : string|boolean => {
        if (mx.checkValueNull(name)) { return false; }
        
        if(/^([a-zA-Z]id|xgl|xfb|xtw|xwc|ali){1}\w*$/i.test(name)) {
            return false;
        }
        
        return name;
    }

    public static checkAccountNumber = (name, min = 4, max = 10) : string|boolean => {
        if (mx.checkValueNull(name)) { return false; }

        name = name.trim();
        if(name.length < min || name.length >= max || 
           /^[1-9][0-9]{3,16}$/g.test(name) === false) {
            return false;
        }
        return name;
    }


    // UUID : AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE
    // 伪UUID, 并非真正唯一
    public static generateUUID = (args?:any) => { 
        args = args || {};
        args.type = args.type || 1;
        args.value = args.value || 1;
        args.code = args.code || 1;
        args.time = mx.timestampS();
        args.rand = mx.generateRandom(1000, 3999);
        
        let rand = mx.generateRandom(10000, 59999);
        let v8 = `${mx.numberFormat(args.type, 1, 0, 16)}${mx.numberFormat(args.value, 2, 0, 16)}${mx.numberFormat(args.code, 2, 0, 16)}${mx.numberFormat(args.rand, 3, 0, 16)}`;
        let v4B = `0000`;
        let v4C = `${mx.numberFormat((args.time >> 16), 4, 0, 16)}`;
        let v4D = `${mx.numberFormat(rand, 4, 0, 16)}`;
        let v4E = `${mx.numberFormat((args.time & 0xFFFF), 4, 0, 16)}`;
        let v4EH= `${mx.numberFormat((args.time / (args.value + args.rand)) & 0xFFFF, 4, 0, 16)}`;
        let v4EL= `${mx.numberFormat((args.time / args.rand + rand) & 0xFFFF, 4, 0, 16)}`;
        return `${v8}-${v4B}-${v4C}-${v4D}-${v4E}${v4EH}${v4EL}`;
    }

    //
    public static generateHASH = (value) : number => {
        //
        let text = "";
        if(typeof value == "number") {
            return value;
        } else if(value instanceof Number) {
            return value.valueOf();
        } else if(value instanceof String) { 
            text = value.valueOf();
        } else if(typeof value == "string") {
            text = value;
        }

        let result = 0xFFFFFFFF;
        if(text.length > 0) {
            result = 0;
            for(let i = 0; i < text.length; i += 4) {
                let c0 = i + 0 > text.length ? 0 : text.charCodeAt(i + 0);
                let c1 = i + 1 > text.length ? 0 : text.charCodeAt(i + 1);
                let c2 = i + 2 > text.length ? 0 : text.charCodeAt(i + 2);
                let c3 = i + 3 > text.length ? 0 : text.charCodeAt(i + 3);
                result = result + (c0 * 1) + (c1 * 100) + (c2 * 10000) + (c3 * 1000000);
            }
            return result & 0xFFFFFFFF;
        }
        return result;
    }
    // NID
    // 1 + 2 + 2 + 10 + 4 + 5 = 24
    // T（类型） X(代码) YYY（值）1234567890 RRRR（冗余随机码）AAAAA（校验码）
    public static generateNID = (args?:any) => {
        args = args || {};
        args.type = args.type || 1;
        args.code = args.code || 1;
        args.value = args.value || 1;
        args.time = Date.now() / 1000;
        args.rand = mx.generateRandom(1000, 9999);

        let value = `${mx.numberFormat(args.type, 1)}${mx.numberFormat(args.code, 1)}${mx.numberFormat(args.value, 3)}`;
        value = `${value}${mx.numberFormat(args.time, 0)}${mx.numberFormat(args.rand, 4)}`;
        let A1 = parseInt(value.substring(5, 9));
        let A2 = parseInt(value.substring(9, 13));
        let A3 = parseInt(value.substring(13, 17));
        let AC = parseInt(value.substring(17, 19));
        let AA = A1 + A2 + A3;
        let AX = Math.round(AA / 3) * 10 + (AA % AC);
        return `${value}${mx.numberFormat(AX, 5)}`;
    }

    // 交易码总长度: 1 + 2 + 2 + 10 + 4 + 5 = 24
    // T（交易类型） XX（交易值）YY（交易代码）1234567890 RRRR（冗余随机码）AAAAA（校验码）
    // 例如:1010115978424169894
    // 1597 8424 1698 94 = round(11719 / 3) + 11719 % 94 = 39060 + 63 = 39123
    public static generateTransactionID = (args?:any) => {
        args = args || {};
        args.type = args.type || 1;
        args.value = args.value || 1;
        args.code = args.code || 1;
        args.time = Date.now() / 1000;
        args.rand = mx.generateRandom(1000, 9999);

        let value = `${mx.numberFormat(args.type, 1)}${mx.numberFormat(args.value, 2)}${mx.numberFormat(args.code, 2)}`;
        value = `${value}${mx.numberFormat(args.time, 0)}${mx.numberFormat(args.rand, 4)}`;
        let A1 = parseInt(value.substring(5, 9));
        let A2 = parseInt(value.substring(9, 13));
        let A3 = parseInt(value.substring(13, 17));
        let AC = parseInt(value.substring(17, 19));
        let AA = A1 + A2 + A3;
        let AX = Math.round(AA / 3) * 10 + (AA % AC);
        return `${value}${mx.numberFormat(AX, 5)}`;
    }

    public static formatTransactionID = (id) => {
        id = id.replace(/\s/g, "");
        if(id.length != 24) { return id; }
        return `${id.substring(0, 5)} ${id.substring(5, 15)} ${id.substring(15, 19)} ${id.substring(19, 24)}`;
    }

    // 卡号验证
    // 仅仅支持万事达或VISA机构卡
    // 3:万事达卡号码段：51xxxx - 55xxxx
    // 2:VISA卡号码段：40xxxx - 49xxxx
    // 1:运通卡：37xxxx - 39xxxx
    // 4:银联卡：62xxxx - 629999
    public static checkDebitCardNumber = (id) : any| Error => {
        if (mx.checkValueNull(id)) {
            return new Error('Card Number null');
        } else if (/^(6|5|4|3)[0-9| ]+$/g.test(id) === false) {
            return new Error('Card Number error');
        }

        //储蓄卡号为19位，非19位卡号暂不列入识别
        const cardNumber = id.replace(/\s+/g, '');
        if (cardNumber.length !== 19) {
            return new Error(`Card Number must be 19 digits, length:${cardNumber.length}`);
        }

        let card = { type:0, name:"unknow", number:cardNumber };
        if(/^5([1-5])+$/g.test(cardNumber)) {
            card.type = 3; card.name = "mastercard";
        } else if(/^4(0-9)+$/g.test(cardNumber)) {
            card.type = 2; card.name = "visa";
        } else if(/^3(7-9)+$/g.test(cardNumber)) {
            card.type = 1; card.name = "amex";
        } else if(/^6(0-2)+$/g.test(cardNumber)) {
            card.type = 4; card.name = "unionpay";
        }
        return card;
    }
    public static checkCreditCardNumber = (id) : any| Error => {
        if (mx.checkValueNull(id)) {
            return new Error('Card Number null');
        } else if (/^(6|5|4|3)[0-9| ]+$/g.test(id) === false) {
            return new Error('Card Number error');
        }

        const cardNumber = id.replace(/\s+/g, '');
        if (/^37\d{13}$/g.test(cardNumber) === false && /^[6|5|4]\d{15}$/g.test(cardNumber) === false) {
            return new Error(`Card Number must be 15/16 digits, length:${cardNumber.length}`);
        }

        let card = { type:0, name:"unknow", number:cardNumber };
        if(/^5([1-5])+$/g.test(cardNumber)) {
            card.type = 3; card.name = "mastercard";
        } else if(/^4(0-9)+$/g.test(cardNumber)) {
            card.type = 2; card.name = "visa";
        } else if(/^3(7-9)+$/g.test(cardNumber)) {
            card.type = 1; card.name = "amex";
        } else if(/^6(0-2)+$/g.test(cardNumber)) {
            card.type = 4; card.name = "unionpay";
        }
        return card;
    }

    // 卡号拥有者姓名检测
    public static checkDebitCardName = (name) : boolean| Error => {
        if (mx.checkValueNull(name)) {
            return new Error('Card Name null');
        } else if (/^[a-z|A-Z| |.]+$/g.test(name) === false) {
            return new Error('Card Name error');
        }
        return true;
    }

    // 卡号拥有者开户银行(英文)
    public static checkDebitCardBankName = (name) : boolean| Error => {
        if (mx.checkValueNull(name)) {
            return new Error('Bank Name null');
        } else if (/^[a-z|A-Z| |.]+$/g.test(name) === false) {
            return new Error('Bank Name error');
        }
        return true;
    }

    // 卡号拥有者开户银行所在地(英文)
    public static checkDebitCardBankAddress = (name) : boolean| Error => {
        if (mx.checkValueNull(name)) {
            return new Error('Bank Address null');
        } else if (/^[a-z|A-Z|0-9| |,|.]+$/g.test(name) === false) {
            return new Error('Bank Address error');
        }
        return true;
    }
}

export default mx;