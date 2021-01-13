
export namespace mx {

class _Platform {
    public static Windows = /windows nt/i;
    public static Mac = /macintosh/i;
    public static Linux = /\(x11;.*linux/i;
    public static Unix = /(freebsd|openbsd)/i;
    public static Solaris = /((?:open)?solaris)/i;
    public static iPad = /ipad/i;
    public static iPod = /ipod/i;
    public static iPhone = /iphone/i;
    public static Android = /android/i;
    public static Blackberry = /blackberry/i;
    public static Playstation = /playstation/i;
    public static Symbian = /(symbian\s?os|symbos|s60(?=;))/i;
}

class _Arch {
    public static x86_64  = /(?:(amd|ia|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i;
    public static x86  = /((?:i[3456]|ia|x)(?:86|32))[;\)]/i;
    public static arm32  = /((?:arm)(?:(v[567]|32))).*[;\)]/i;
    public static arm64  = /((?:arm)(?:(v[8]|64))).*[;\)]/i;
}

class _OS {
    public static Windows = /windows nt\s([\d\w\.\-]+)/i;
    public static Macos = /os x\s([\d\w\.\-]+)/i;
    public static Linux = /linux/i;
    public static Unix = /(freebsd|openbsd)/i;
    public static Solaris = /((?:open)?solaris)/i;
    public static iOS = /iPhone\s*os\s([\d\w\.\-]+)/i;
    public static Android = /Android\s([\d\w\.\-]+)/i;
};

class _Browsers {
    public static Edge = /edge/i;
    public static Amaya = /amaya/i;
    public static Konqueror = /konqueror/i;
    public static Epiphany = /epiphany/i;
    public static SeaMonkey = /seamonkey/i;
    public static Flock = /flock/i;
    public static OmniWeb = /omniweb/i;
    public static Chromium = /chromium|crios/i;
    public static Chrome = /chrome/i;
    public static Safari = /safari/i;
    public static IE = /msie|trident/i;
    public static Opera = /opera|OPR/i;
    public static Firefox = /firefox/i;

    public static EdgeVersion = /Edge\/([\d\w\.\-]+)/i;
    public static FirefoxVersion = /firefox\/([\d\w\.\-]+)/i;
    public static IEVersion = /msie\s([\d\.]+[\d])|trident\/\d+\.\d+;.*[rv:]+(\d+\.\d)/i;
    public static ChromeVersion = /chrome\/([\d\w\.\-]+)/i;
    public static ChromiumVersion = /(?:chromium|crios)\/([\d\w\.\-]+)/i;
    public static SafariVersion = /version\/([\d\w\.\-]+)/i;
    public static OperaVersion = /version\/([\d\w\.\-]+)|OPR\/([\d\w\.\-]+)/i;
    public static OmniWebVersion = /omniweb\/v([\d\w\.\-]+)/i;
}

export class UserAgent
{
    // 
    public isPC:boolean = false;
    public isMobile:boolean = false;
    public isTablet:boolean = false;

    //Platform
    public isWindows:boolean = false;
    public isMac:boolean = false;
    public isLinux:boolean = false;
    public isUnix:boolean = false;
    public isSolaris:boolean = false;
    public isiPad:boolean = false;
    public isiPod:boolean = false;
    public isiPhone:boolean = false;
    public isAndroid:boolean = false;
    public isBlackberry:boolean = false;
    public isPlaystation:boolean = false;
    public isSymbian:boolean = false;

    public isIE:boolean = false;
    public isEdge:boolean = false;
    public isSafari:boolean = false;
    public isFirefox:boolean = false;
    public isChrome:boolean = false;
    public isOpera:boolean = false;

    public browser:any = {name:"", version:""};
    public os:any = {name:"unknow", arch:"unknow", version:"0.0", build:""};
    public platform:string = "unknown";
    public source:string = "";
    constructor() {

    }

    public  parsePlatform(text) {
        switch (true) {
            case _Platform.Windows.test(text):
                this.isWindows = true;
                return 'Microsoft Windows';
            case _Platform.Mac.test(text):
                this.isMac = true;
                return 'Apple Mac';
            case _Platform.Linux.test(text):
                this.isLinux = true;
                return 'Linux';    
            case _Platform.Unix.test(text):
                this.isUnix = true;
                return 'Unix';        
            case _Platform.Solaris.test(text):
                this.isSolaris = true;
                return 'Solaris';    
            case _Platform.iPad.test(text):
                this.isiPad = true;
                return 'iPad';
            case _Platform.iPod.test(text):
                this.isiPod = true;
                return 'iPod';
            case _Platform.iPhone.test(text):
                this.isiPhone = true;
                return 'iPhone';                         
            case _Platform.Android.test(text):
                this.isAndroid = true;
                return 'Android';
            case _Platform.Blackberry.test(text):
                this.isBlackberry = true;
                return 'Blackberry';
            case _Platform.Playstation.test(text):
                this.isPlaystation = true;
                return 'Playstation';
            case _Platform.Symbian.test(text):
                this.isSymbian = true;
                return 'Symbian';                
            default:
                return 'Unknown';
        }
    }

    public  parseOS(text) {
        if (this.isWindows) {
            let res = text.match(_OS.Windows);
            if(res.length >= 2) {
                let ver = res[1] ? res[1].split(".") : ["0", "0"];
                if(ver && ver[0] == 5 &&  ver[1] == 0) {
                    return {name:"Windows 2000", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 5 &&  ver[1] == 1) {
                    return {name:"Windows XP", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 5 &&  ver[1] == 2) {
                    return {name:"Windows Server 2003", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 6 &&  ver[1] == 0) {
                    return {name:"Windows Vista", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 6 &&  ver[1] == 1) {
                    return {name:"Windows 7", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 6 &&  ver[1] == 2) {
                    return {name:"Windows 8", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 6 &&  ver[1] == 3) {
                    return {name:"Windows 8.1", version:ver[0]+"."+ver[1]};
                } else if(ver && ver[0] == 10 &&  ver[1] == 0) {
                    return {name:"Windows 10", version:ver[0]+"."+ver[1]};
                } else {
                    return {name:"Windows Unknow", version:(ver[0] || "0") + "." + (ver[1] || "0")};
                }
            }
            return {name:"Windows Unknow", version:"0.0"};
        } else if (this.isMac) {
            let res = text.match(_OS.Macos);
            let ver = res[1] ? res[1].split("_") : ["0", "0", "0"];
            if(res.length >= 3) { 
                if(ver && ver[0] == 10 && ver[1] == 0) {
                    return {name:"Mac OS X Cheetah", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 1) {
                    return {name:"Mac OS X Puma", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 2) {
                    return {name:"Mac OS X Jaguar", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 3) {
                    return {name:"Mac OS X Panther", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 4) {
                    return {name:"Mac OS X Tiger", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 5) {
                    return {name:"Mac OS X Leopard", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 6) {
                    return {name:"Mac OS X Snow Leopard", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 7) {
                    return {name:"OS X Lion", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 8) {
                    return {name:"OS X Mountain Lion", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 9) {
                    return {name:"OS X Mavericks", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 10) {
                    return {name:"OS X Yosemite", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 11) {
                    return {name:"OS X El Capitan", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 12) {
                    return {name:"macOS Sierra", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 13) {
                    return {name:"macOS High Sierra", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 14) {
                    return {name:"macOS Mojave", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else if(ver && ver[0] == 10 && ver[1] == 15) {
                    return {name:"macOS Catalina", version:ver[0]+"."+ver[1]+(ver[2] ? "." + ver[2] : "")};
                } else {
                    return {name:"Mac OS X Unknow", version:(ver[0]||"0")+"."+(ver[1]||"0")+(ver[2] ? "." + ver[2] : "")};
                }
            }
            return {name:"Mac OS X Unknow", version:"0.0"};
        } else if (this.isLinux) { 
            return {name:"Linux", version:"0.0"};
        } else if (this.isUnix) { 
            return {name:"Unix", version:"0.0"};
        } else if (this.isSolaris) { 
            return {name:"Solaris", version:"0.0"};
        } else if (this.isiPad || this.isiPod || this.isiPhone) {
            let res = text.match(_OS.iOS);
            let ver = res && res[1] ? res[1].split("_") : ["0", "0", "0"];
            let desc = "iOS";
            let vv;
            if(ver && ver.length >= 1) {
                vv = ver[0] || "0";
                if(ver && ver.length >= 2) {
                    vv = vv + "." + ver[1] || "0";
                    if(ver && ver.length >= 3) {
                        vv = vv + "." + ver[2] || "0";
                    } 
                }
            } else {
                vv = "0.0";
            }
            desc = desc + " " + vv;

            if(this.isiPhone) {
                desc = "iPhone " + desc;
            } else if (this.isiPod) {
                desc = "iPod " + desc;
            } else if (this.isiPod) {
                desc = "iPad " + desc;
            } else {
                desc = "Unknow " + desc;
            }

            return {name:desc, version:vv||"0.0"};
        } else if (this.isAndroid) { 
            let res = text.match(_OS.Android);
            let ver = res && res[1] ? res[1].split(".") : ["0", "0", "0"];
            let desc = "Android";
            let vv;
            if(ver && ver.length >= 1) {
                vv = ver[0] || "0";
                if(ver && ver.length >= 2) {
                    vv = vv + "." + ver[1] || "0";
                    if(ver && ver.length >= 3) {
                        vv = vv + "." + ver[2] || "0";
                    } 
                }
            } else {
                vv = "0.0";
            }
            desc = desc + " " + vv;
            return {name:desc, version:vv||"0.0"};
        } else if (this.isBlackberry) { 
            return{name: "Blackberry", version:"0.0"};
        } else if (this.isSymbian) { 
            return {name:"Symbian", version:"0.0"};
        }
        return "Unknow";
    }

    public  parseArch(text, os) {
        switch (true) {
            case _Arch.x86.test(text):
                os.arch = "x86"; break ;
            case _Arch.x86_64.test(text):
                os.arch = "x86_64"; break ;
            case _Arch.arm32.test(text):
                os.arch = "arm32"; break ;  
            case _Arch.arm64.test(text):
                os.arch = "arm64"; break ;      
            default:
                os.arch = undefined; break ;  
        }

        if(!os.arch && this.isAndroid && os.version) {
            let ver = os.version.split(".");
            if(ver && ver[0] >= 7) {
                os.arch = "arm64";
            } else {
                os.arch = "arm32";
            }
        } else if(!os.arch && (this.isiPhone || this.isiPod || this.isiPad)) {
            let ver = os.version.split(".");
            if(ver && ver[0] >= 8) {
                os.arch = "arm64";
            } else {
                os.arch = "arm32";
            }
        }

        if(!os.arch) {
            os.arch = "unknow";
        }
    }

    public  parseBuild(text, os) {
        os.build = "";

        if(this.isiPhone || this.isiPod || this.isiPad) {
            let res = text.match(/mobile\s*\/([\d\w\.\-]+)/i);
            if(res && res.length > 1) {
                os.build = res[1];
            }
        } else if(this.isAndroid) {
            let res = text.match(/build\s*\/([\d\w\.\-]+)/i);
            if(res && res.length > 1) {
                os.build = res[1];
            }
        }
    }

    public  parseBrowser(text) {
        let vv = "0.0";
        switch (true) {
            case _Browsers.Edge.test(text):
                {
                this.isEdge = true;
                let res = text.match(_Browsers.EdgeVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"Edge", version:vv};
                }
            case _Browsers.Konqueror.test(text):
                return {name:"Konqueror", version:"0.0"};
            case _Browsers.Amaya.test(text):
                return {name:"Amaya", version:"0.0"};
            case _Browsers.Epiphany.test(text):
                return {name:"Epiphany", version:"0.0"};
            case _Browsers.SeaMonkey.test(text):
                return {name:"SeaMonkey", version:"0.0"};
            case _Browsers.Flock.test(text):
                return {name:"Flock", version:"0.0"};
            case _Browsers.OmniWeb.test(text):
                {
                let res = text.match(_Browsers.OmniWebVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"OmniWeb", version:vv};
                }
            case _Browsers.Opera.test(text):
                {
                this.isOpera = true;
                let res = text.match(_Browsers.OperaVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"Opera", version:vv};
                }
            case _Browsers.Chromium.test(text):
                {
                this.isChrome = true;
                let res = text.match(_Browsers.ChromiumVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"Chromium", version:vv};
                }
            case _Browsers.Chrome.test(text):
                {
                this.isChrome = true;
                let res = text.match(_Browsers.ChromeVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"Chrome", version:vv};
                }
            case _Browsers.Safari.test(text):
                {
                this.isSafari = true;
                let res = text.match(_Browsers.SafariVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"Safari", version:vv};
                }
            case _Browsers.IE.test(text):
                {
                this.isIE = true;
                let res = text.match(_Browsers.IEVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"IE", version:vv};
                }
            case _Browsers.Firefox.test(text):
                {
                this.isFirefox = true;
                let res = text.match(_Browsers.FirefoxVersion);
                if(res && res.length > 1 && res[1]) { vv = res[1]; }
                return {name:"Firefox", version:vv};
                }
            default:
                return {name:"unknown", version:"0.0"};
        }
    }

    public static parse(text:string) {
        let ua:UserAgent = new UserAgent();
        ua.source = text.replace(/^\s*/, '').replace(/\s*$/, '');

        //
        ua.platform = ua.parsePlatform(ua.source);
        if(ua.isWindows || ua.isMac || ua.isLinux || ua.isUnix) {
            ua.isPC = true;
        }
        if(ua.isiPhone || ua.isiPod || ua.isAndroid || ua.isBlackberry || ua.isSymbian) {
            ua.isMobile = true;
        }
        if(ua.isiPad) {
            ua.isTablet = true;
        }

        //
        ua.os = ua.parseOS(ua.source);
        ua.parseArch(ua.source, ua.os);
        ua.parseBuild(ua.source, ua.os);

        ua.browser = ua.parseBrowser(ua.source);
        return ua;
    }
}
} //namespace mx