
//
let _singletonInstances:any = { };

//
export class SingletonBase {

    //
    protected _clazzTypeName:string = "";
    public get clazzTypeName() { return this._clazzTypeName; }

    constructor() {
        this._clazzTypeName =  this.constructor.name;
    }
}

export class Singleton<_T extends SingletonBase> extends SingletonBase {
    //
    constructor() {
        super();
        
        let instance = _singletonInstances[this._clazzTypeName];
        if(instance) {
            throw new Error(`${this.clazzTypeName} Singleton is setting.`);
            return ;
        }
        _singletonInstances[this._clazzTypeName] = this;
    }
}

//
export function NewInstance<_T extends SingletonBase>(clazz: new() => _T) : _T {
    return new clazz();
}

export function GetInstance<_T extends SingletonBase>(clazz: new() => _T, alloc:boolean = false) : _T| null {
    let instance = _singletonInstances[clazz.name];
    if(!instance) {
        if(alloc) {
            return NewInstance<_T>(clazz);
        }
        return null;
    }
    return instance;
}
