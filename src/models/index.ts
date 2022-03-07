import MongoosePlugin from "../../modules/mongoose";
import { User } from './user';

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/fastify-api-satrter";

const ORM = MongoosePlugin({ User }, uri)

export default ORM