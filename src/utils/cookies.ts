
import { O_TRUNC } from "constants";
import * as mx_I from "./index";
import * as mx_crypto from "./crypto";


export namespace mx { 
    export interface CookiesItem {
        name:string;
        time:number;    //生成时间ms
        life:number;    //持续时间ms
        value:string;   //json
    }

    export interface CookiesRoot {
        name:string;
        time:number;
        items:Array<CookiesItem>;
    }

    export class Cookies {
        protected _name:string = "";
        protected _crypto_key:string| undefined = undefined;
        protected _cookies:any;
        protected _cookies_root:CookiesRoot;
        constructor(name:string, cookies:any, key?:string) {
            this._name = name;
            this._crypto_key = key;
            this._cookies = cookies;
            
            let root = this.load(this._name);
            if(!root) {
                root = {
                    name:this._name,
                    time:mx_I.mx.timestampMS(),
                    items:new Array<CookiesItem>()
                }
            }
            this._cookies_root = root;
            this.save(this._name);

        }

        protected save(name:string) {
            try {
                let value = JSON.stringify(this._cookies_root);
                value = mx_crypto.mx.base64EncodeString(value, true);
                return this._cookies.set(name, value, {
                    maxAge: mx_I.mx.timestampMS(new Date("2099-01-01")) - mx_I.mx.timestampMS(),
                    overwrite: true,
                    signed: true,
                    secure: false,
                    httpOnly: false
                });
            } catch(e) {
                console.error(e);
            }
            return null;
        }

        protected load(name:string) {
            try {
                let source = this._cookies.get(name, {signed: true});
                if(!source) {
                    return undefined;
                }
                source = mx_crypto.mx.base64DecodeString(source, true);
                let root:CookiesRoot = JSON.parse(source);
                if(root) {
                    for(let i = 0; i < root.items.length; ) {
                        let value = root.items[i];
                        if(value.life >= 0 && (value.time + value.life) < mx_I.mx.timestampMS()) {
                            root.items.splice(i, 1);
                            continue;
                        } 
                        i ++;
                    }
                }
                return root;
            } catch (e) {
                console.error(e);
            }
            return null;
        }

        public getItem(key:string) : CookiesItem| undefined {
            let item = this._cookies_root.items.find((v) => {
                return v.name == key;
            })
            return item;
        }

        public deleteItem(key:string) : boolean {
            let index = this._cookies_root.items.findIndex((v) => {
                return v.name == key;
            })
            if(index >= 0) {
                this._cookies_root.items.splice(index, 1);
            }
            return true;
        }

        public setItem(key:string, item:CookiesItem) : boolean {
            let index = this._cookies_root.items.findIndex((v) => {
                return v.name == key;
            })
            if(index >= 0) {
                this._cookies_root.items.splice(index, 1);
            }
            this._cookies_root.items.push(item);
            return true;
        }

        public get(key:string) {
            if(!this._cookies_root) {
                return null;
            }

            let item = this.getItem(key);
            if(!item) {
                return null;
            }

            if(item.life >= 0 && item.time + item.life < mx_I.mx.timestampMS()) {
                this.deleteItem(key);
                this.save(this._name);
                return null;
            }
            
            return item.value;
        }

        public set(key:string, value:any, time:number = 60 * 1000) { 
            if(typeof value == "string" || value instanceof String) { }
            else { value = JSON.stringify(value); }

            let item:CookiesItem = {
                name: key,
                value: value,
                time: mx_I.mx.timestampMS(),
                life: time
            }

            this.setItem(key, item);
            this.save(this._name);
        }
    }
}
