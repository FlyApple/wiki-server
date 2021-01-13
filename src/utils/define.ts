
interface ACCOUNT {
    number:string;
    name:string;
    email:string;
    phone:string;
    current:string;
    type_index?: number;
    type_name?: string;
};


//
export class mx {

    //
    public static S_SUCCESS                 = 1;
    public static S_OK                      = 0;
    public static S_FAIL                    = -1;

    //
    public static DATETIME_EXPIRED_MAX      = "2099-12-31 23:59:59";
    public static DATETIME_EXPIRED_MAX_T    = new Date(mx.DATETIME_EXPIRED_MAX);

    //
    public static ACCOUNT_NAME_MAXLEN        = 15+1;
    public static ACCOUNT_NUMBER_MAXLEN      = 10+1;
    public static PASSWORD_MAXLEN            = 15+1;
    public static PASSWORD_MD5_MAXLEN        = (128 / 8) * 2;    //16 bytes
    public static PASSWORD_SHA1_MAXLEN       = (192 / 8) * 2;    //24 bytes
    public static PASSWORD_SHA256_MAXLEN     = (256 / 8) * 2;    //32 bytes
    public static CAPTCHA_MAXLEN             = 8+1;
    public static CAPTCHA_AUTH_MAXLEN        = 6+1;

    public static ACCOUNT_TYPE_MID           = 0;
    public static ACCOUNT_TYPE_NAME          = 1;
    public static ACCOUNT_TYPE_PHONE         = 2; 
    public static ACCOUNT_TYPE_EMAIL         = 3; 
    public static ACCOUNT_TYPENAME_MID       = "MID";
    public static ACCOUNT_TYPENAME_NAME      = "ACCOUNT NAME";
    public static ACCOUNT_TYPENAME_PHONE     = "PHONE NUMBER"; 
    public static ACCOUNT_TYPENAME_EMAIL     = "EMAIL ADDRESS";

    //user privilege
    public static PRIVILEGE_LEVEL_BANNED     = 0; //封号
    public static PRIVILEGE_LEVEL_GUEST      = 1; //访客
    public static PRIVILEGE_LEVEL_REGISTERED = 2; //已注册
    public static PRIVILEGE_LEVEL_USER       = 3; //普通用户

    //TAGS
    public static TAGS_MAXNUM                = 5;
    public static TAGS_ADMIN_MAXNUM          = 7;
    public static TAGS_MAXLEN                = 10 + 1;

}

//
export default mx;