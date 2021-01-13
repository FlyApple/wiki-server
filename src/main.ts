import Application from './Application';

function main() {
    try {
        let application:Application = new Application();
        application.init();
        application.run();
    }catch(e) {
        console.error(e);
    }
}

main();