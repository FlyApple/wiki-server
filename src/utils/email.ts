
import mx from "../utils";

//
export class EMailClient {
    constructor() {
    }

    private parse_params = (params) => {
        let text = "";
        if(params instanceof Array) {
            params.forEach((v, i) => {
                if(i == 0) {
                    text = `${text}${text.length > 0 ? "&" : ""}token_id=${v}`;
                } else if(i == 1) {
                    text = `${text}${text.length > 0 ? "&" : ""}token_hash=${v}`;
                } else {
                    text = `${text}${text.length > 0 ? "&" : ""}A${i}=${v}`;
                }
            });
        } else if (params instanceof Object) {
            for(let i in params) {
                let v = params[i];
                text = `${text}${text.length > 0 ? "&" : ""}${i}=${v}`;
            }
        }
        return text;
    }

    public send_activate_account = async (sender:string, address:string,
        title:string, account:string, 
        url:string, params:any, callback?:Function) : Promise<boolean> => {
        let text = this.parse_params(params);
        if(!text || text.length == 0) {
            return false;
        }

        let link_url = `${url}?active=true&${text}`;
        let content = `
        Dear user:<br/>
        <br/>
        Please activate your account: ${account}<br/>
        Link:<a href="${link_url}">Activate Account</a><br/>
        If you can't click the link, please copy the link below to your browser and visit:<br/>
        ${link_url}<br/>
        <br/>
        If you do not activate, the account will not be available.<br/>`;
        title = `<Important> ${title}`;
        if(!await this.send("", title, content)){
            return false;
        }
        return true;
    }

    public send_verifying_account = async (sender:string, address:string,
        title:string, account:string, 
        url:string, params:any, callback?:Function) : Promise<boolean> => {
        let text = this.parse_params(params);
        if(!text || text.length == 0) {
            return false;
        }

        let link_url = `${url}?${text}`;
        let content = `
        Dear user:<br/>
        <br/>
        Please verifying your account: ${account}<br/>
        Link:<a href="${link_url}">Verifying Account</a><br/>
        If you can't click the link, please copy the link below to your browser and visit:<br/>
        ${link_url}<br/>
        <br/>
        If you do not activate, the account will not be available.<br/>`;
        title = `<Important> ${title}`;
        if(!await this.send("", title, content)){
            return false;
        }
        return true;
    }

    private send = async (address, title, content) : Promise<boolean> => {

        console.warn(address, title);
        console.warn(content);
        return true;
    }
}

const email_client_instance = new EMailClient();

export let EMailClient_Instance = email_client_instance;
