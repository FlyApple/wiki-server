import * as fs from "fs";
import * as os from "os";

// 纯后端使用
export namespace mx {

    export let cpu_cores_number = () => {
        return os.cpus().length;
    }

    export let cpu_cores = (index) => {
        if(index < 0 || index >= cpu_cores_number()) { return null; }
        return os.cpus()[index];
    }

    export let cpu_rate = () => {
        let cpus = os.cpus();
        let rate = 0.0;
        for(let i = 0; i < cpu_cores_number(); i ++) {
            rate += cpu_core_rate(i);
        }
        return rate / cpu_cores_number();
    }

    export let cpu_speed = () => {
        let cpus = os.cpus();
        let speed = 0.0;
        for(let i = 0; i < cpu_cores_number(); i ++) {
            speed += cpu_core_speed(i);
        }
        return speed / cpu_cores_number();
    }

    let _cpus_time = new Array<number>();
    let _cpus_idle = new Array<number>();
    export let cpu_core_rate = (index) => {
        if(index < 0 || index >= cpu_cores_number()) { return 0; }
        let cpu = os.cpus()[index];
        let time = cpu.times.user + cpu.times.sys + cpu.times.nice + cpu.times.irq + cpu.times.idle;
        let idle = cpu.times.idle;
        if(!_cpus_time[index]) {
            _cpus_time[index] = time;
        } else {
            time -= _cpus_time[index]
        }
        if(!_cpus_idle[index]) {
            _cpus_idle[index] = idle;
        } else {
            idle -= _cpus_idle[index]
        }

        let rate = idle / time;
        return 1 - rate;
    }

    export let cpu_core_speed = (index) => {
        if(index < 0 || index >= cpu_cores_number()) { return 0; }
        let cpu = os.cpus()[index];
        return cpu.speed;
    }

    export let mem_total_number = () => {
        let mem = os.totalmem();
        return mem;
    }

    export let mem_free_number = () => {
        let mem = os.freemem();
        return mem;
    }

    export let mem_using_number = () => {
        let mem = os.totalmem() - os.freemem();
        return mem;
    }

    export let arch = () => {
        return os.arch();
    }
}
