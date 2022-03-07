import {
  FastifyInstance,
  FastifyPluginAsync /*, FastifyPluginOptions*/,
} from "fastify";
import fp from "fastify-plugin";
import mongoose, { Model, Document, Schema } from "mongoose";

type Models = {
  [key: string]: Model<Document>;
};

export default function MongoosePlugin(models: Models, uri: string) {
  const ConnectDB: FastifyPluginAsync<any> = async (
    fastify: FastifyInstance
  ) => {
    try {
      mongoose.connection.on("connected", () => {
        fastify.log.info({ actor: "MongoDB" }, "connected");
      });
      mongoose.connection.on("disconnected", () => {
        fastify.log.error({ actor: "MongoDB" }, "disconnected");
      });
      mongoose.connection.on("error", (err) => {
        fastify.log.error({ actor: "MongoDB", error: err }, "error");
      });
      await mongoose.connect(uri);
      fastify.decorate("db", models);
      return Promise.resolve();
    } catch (error) {
      console.error(error);
      return Promise.reject();
    }
  };

  return fp(ConnectDB);
}

