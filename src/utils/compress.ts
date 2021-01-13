
import * as zlib from 'pako';
import * as mx_crypto from './crypto';

//
class XCompress {
    private _zlib:zlib.Deflate = new zlib.Deflate({ level: 6, });

    constructor() {
    }

    public  update = (buffer:Uint8Array) => {
        if(!this._zlib) { return false; }
        this._zlib.push(buffer);
        return true;
    }

    public  final = () : Uint8Array| null => {
        if(!this._zlib) { return null; }
        this._zlib.push([], true);
        return this._zlib.result as Uint8Array;
    }
}

class XUNCompress {
    private _zlib:zlib.Inflate = new zlib.Inflate();

    constructor() {
    }

    public  update = (buffer:Uint8Array) => {
        if(!this._zlib) { return false; }
        this._zlib.push(buffer);
        return true;
    }

    public  final = () : Uint8Array| null => {
        if(!this._zlib) { return null; }
        this._zlib.push([], true);
        return this._zlib.result as Uint8Array;
    }
}


//
export class mx {
    // 默认  2048  0x800    2KB
    //      4096  0x1000    4KB
    //     65536  0x10000   64KB
    public static COMPRESS_BLOCK_SIZE   = 32;
    public static COMPRESS_BLOCK_MAXNUM = 0x10000;  //65536
    
    private static uncompressBlock = (buffer:Uint8Array) => {
        let zlx = new zlib.Inflate();
        zlx.push(buffer, true);
        if(zlx.err) {
            console.error(zlx.msg);
            return null;
        }
        console.info(zlx.result);
        return zlx.result as Uint8Array;
    }

    // 最大32位长度
    public static compress = (buffer:Buffer) => {
        let length = buffer.length;

        //
        let comp = new XCompress();

        let block_size = mx.COMPRESS_BLOCK_SIZE;
        let source_total = 0; 

        for(let i = 0; source_total < length; i ++) {
            block_size = source_total + block_size < length ? block_size: length - source_total;

            let temp = buffer.subarray(source_total, source_total + block_size);
            if(!comp.update(temp)) { break; }

            source_total += block_size;
        }

        let result = comp.final();
        if(!result) { return null; }
        let data = Buffer.from(result);

        let compress_length= 8 + data.length;
        let compress_buffer= Buffer.alloc(compress_length);

        // 压缩长度
        compress_buffer.writeUInt32LE(compress_length, 0x00);
        // 原始长度
        compress_buffer.writeUInt32LE(source_total, 0x04);
        // 
        data.copy(compress_buffer, 8);

        //
        return compress_buffer.length == 0 ? null : compress_buffer;
    }

    // 最大32位长度
    public static uncompress = (buffer:Buffer) => {
        let length = buffer.length;

        //
        let compress_length = buffer.readUInt32LE(0x00);
        let source_length = buffer.readUInt32LE(0x04);
        if(compress_length > length) {
            return null;
        }

        let compress_buffer = buffer.subarray(0x08);
        length = compress_buffer.length;

        let uncomp = new XUNCompress();
        uncomp.update(compress_buffer);
        let result = uncomp.final();
        if(!result) {
            return null;
        }
        let data = Buffer.from(result);

        let uncompress_buffer= data;
        let uncompress_length= data.length;
        return uncompress_buffer.length == 0 ? null : uncompress_buffer;
    }

    public static compressString = (value:string) => {
        let result = Buffer.from(value, "utf8");
        let compress_buffer = mx.compress(result);
        if(!compress_buffer) { return null; }
        return Buffer.from(compress_buffer);
    }

    public static uncompressString = (value:Buffer) => {
        let uncompress_buffer = mx.uncompress(value);
        if(!uncompress_buffer) { return ""; }
        return  uncompress_buffer.toString("utf8");
    }

    public static compressStringBase64 = (value:string, urlencode?:boolean) => {
        let result = mx.compressString(value);
        if(!result) { return ""; }
        return mx_crypto.mx.base64Encode(result, urlencode);
    }

    public static uncompressStringBase64 = (value:string, urlencode?:boolean) => {
        let buffer = mx_crypto.mx.base64Decode(value, urlencode);
        if(!buffer) { return ""; }
        return mx.uncompressString(buffer);
    }
}

//
export default mx;