import { exception } from "console";
import { type } from "os";

export class SingletonBase {
    protected _clazzTypeName:string = "";
    public get clazzTypeName() { return this._clazzTypeName; }

    constructor() {
        this._clazzTypeName =  this.constructor.name;
    }
}

export default class Singleton<_T extends SingletonBase> extends SingletonBase {
    protected static _singletonInstance:any| undefined = undefined;
    constructor() {
        super();
        
        //
        if(Singleton._singletonInstance) {
            throw new Error(`${this.clazzTypeName} Singleton is setting.`);
            return ;
        }
        Singleton._singletonInstance = this;
    }

    public get getSingleton() : _T {
        return Singleton._singletonInstance;
    }
}