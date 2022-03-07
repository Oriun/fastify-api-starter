import Server from "../modules/server";
import ORM from "./models";

const [server, start] = Server([
    ORM
])

export default start