import dotenv from "dotenv";
dotenv.config();

import start from "./src/app";
start(10).then(() => console.log("server running"));
