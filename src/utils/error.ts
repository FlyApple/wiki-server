

//
export default class XError extends Error {

    public static ERRORCODE_NONE = 0;
    public static ERRORCODE_UNKNOW = -1;
    public static ERRORCODE_INTERNAL = -2;
    public static ERRORCODE_STOPPING = -3;

    // 操作错误
    public static ERRORCODE_OPERATION_ERROR            = -101;
    // 无效操作
    public static ERRORCODE_OPERATION_INVALID          = -102;
    // 没有权限操作
    public static ERRORCODE_OPERATION_NOT_PERMISSION   = -107;
    // 拒绝操作
    public static ERRORCODE_OPERATION_DENIED           = -108;
    // 操作已过时
    public static ERRORCODE_OPERATION_EXPIRED          = -109;
    // 访问错误
    public static ERRORCODE_ACCESS_ERROR            = -1001;
    // 无效访问
    public static ERRORCODE_ACCESS_INVALID          = -1002;
    // 没有权限访问
    public static ERRORCODE_ACCESS_NOT_PERMISSION   = -1007;
    // 拒绝访问
    public static ERRORCODE_ACCESS_DENIED           = -1008;
    // 访问已过时
    public static ERRORCODE_ACCESS_EXPIRED          = -1009;

    public static ERROR_NONE            = "";
    public static ERROR_UNKNOW          = "UNKNOW";
    public static ERROR_STOPPING        = "STOPPING";
    public static ERROR_INTERNAL        = "INTERNAL ERROR";

    //
    public static ERROR_ACCESS_ERROR    = "Access Error";
    public static ERROR_ACCESS_INVALID  = "Access invalid";
    public static ERROR_ACCESS_NOT_PERMISSION = "Access Not Permission";
    public static ERROR_ACCESS_DENIED   = "Access Denied";
    public static ERROR_ACCESS_EXPIRED  = "Access Expired";
    public static ERROR_OPERATION_ERROR    = "Operation Error";
    public static ERROR_OPERATION_INVALID  = "Operation invalid";
    public static ERROR_OPERATION_NOT_PERMISSION = "Operation Not Permission";
    public static ERROR_OPERATION_DENIED   = "Operation Denied";
    public static ERROR_OPERATION_EXPIRED  = "Operation Expired";

    public static NewError(code:number = XError.ERRORCODE_UNKNOW, name?:string, message?:string) {
      return new XError(code, name, message);
    }

    /**
     * The error number for the error code
     */
    public code: number = XError.ERRORCODE_UNKNOW;

    //
    public constructor(code:number = XError.ERRORCODE_UNKNOW, name:string = XError.ERROR_UNKNOW, message?:string) {
      super(message);
      this.name = name;
      this.code = code;
    }
}
