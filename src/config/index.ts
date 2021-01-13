
import { config_development } from "./dev";
import { config_production } from "./prod";

export default (process.env.NODE_ENV === 'development' ? config_development : config_production);
