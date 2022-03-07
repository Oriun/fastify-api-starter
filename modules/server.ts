import fast, { FastifyInstance, FastifyLoggerInstance, FastifyLoggerOptions, FastifyPluginAsync, FastifyServerOptions } from "fastify";
import cors from "fastify-cors";
import compress from "fastify-compress";
import cookie, { FastifyCookieOptions } from "fastify-cookie";
import FStatic from "fastify-static";
import path from "path";

// fastify.register(FStatic, {
//   root: path.join(__dirname, "../template"),
//   prefix: "/static/",
//   allowedPath: (pathname) =>
//     pathname !== "/" && !pathname.endsWith("index.html"),
// });

// fastify.register(FStatic, {
//   root: path.join(__dirname, "../admin"),
//   prefix: "/admin/",
//   decorateReply: false,
// });

type ServerStartFunction = (maxAtempts: number) => Promise<void>;
type ServerParams = {
  logger: boolean | FastifyLoggerInstance | FastifyLoggerOptions;
  ignoreTrailingSlash: boolean;
  bodyLimit: number;
  cookie: boolean;
  cookieSecret: string;
  cookieParseOptions: {};
  cors: boolean;
  corsOrigin: RegExp | string | string[] | ((origin: string) => boolean);
  corsAlllowCredential: boolean;
  compress: boolean;
  [key: string | symbol]: any;
};

const defaultServerParams: ServerParams = {
  // Server
  logger: { file: "./server.log" },
  ignoreTrailingSlash: true,
  bodyLimit: 100 * 1024 ** 2,
  //Cookie
  cookie: true,
  cookieSecret: "alabama",
  cookieParseOptions: {},
  // Cors
  cors: true,
  corsOrigin: /.+/,
  corsAlllowCredential: true,
  // Compression
  compress: true,
};

const defaultParamsProxyHandler: ProxyHandler<ServerParams> = {
  get: function (object, key) {
    return object.hasOwnProperty(key) ? object[key] : defaultServerParams[key];
  },
  set: function () {
    return false;
  },
  has: function (object, key) {
    return key in object;
  },
};

export default function Server(
  plugins: FastifyPluginAsync[] = [],
  params: Partial<ServerParams> = {}
): [FastifyInstance, ServerStartFunction] {
  const options = new Proxy(params, defaultParamsProxyHandler);
  const fastify = fast({
    logger: options.logger,
    ignoreTrailingSlash: options.ignoreTrailingSlash,
    bodyLimit: options.bodyLimit,
  });

  if (options.cors)
    fastify.register(cors, {
      origin: options.corsOrigin,
      credentials: options.corsAlllowCredential,
    });

  if (options.compress)
    fastify.register(compress, {
      global: true,
      encodings: ["gzip", "deflate"],
    });

  if (options.cookie)
    fastify.register(cookie, {
      secret: options.cookieSecret,
      parseOptions: options.cookieParseOptions,
    } as FastifyCookieOptions);

  for (const plugin of plugins) {
    fastify.register(plugin);
  }

  function start(i: number): Promise<void> {
    return fastify
      .listen(process.env.PORT || 3000, "0.0.0.0")
      .then(console.log)
      .catch((err) => {
        fastify.log.error(err);
        if (!i) return process.exit(1);
        return new Promise((r) => setTimeout(() => start(i - 1).then(r), 3000));
      });
  }

  return [fastify, start];
}
