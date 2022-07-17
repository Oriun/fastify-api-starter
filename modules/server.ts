/** @format */

import fast, {
  FastifyInstance,
  FastifyLoggerInstance,
  FastifyLoggerOptions,
  FastifyPluginAsync,
  FastifyRequest,
  FastifyReply
} from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import health from '@fastify/under-pressure';
import rateLimit, { RateLimitPluginOptions } from '@fastify/rate-limit';
import cookie, { FastifyCookieOptions } from '@fastify/cookie';
// import FStatic from "fastify-static";
// import path from "path";

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
  port: number;
  host: string;
  cookie: boolean;
  cookieSecret: string;
  cookieParseOptions: {};
  cors: boolean;
  corsOrigin: RegExp | string | string[] | ((origin: string) => boolean);
  corsAlllowCredential: boolean;
  compress: boolean;
  health: health.UnderPressureOptions | false;
  limit: RateLimitPluginOptions | false;
  [key: string | symbol]: any;
};

export const defaultServerParams: ServerParams = {
  // Server
  logger: { file: './server.log' },
  ignoreTrailingSlash: true,
  bodyLimit: 100 * 1024 ** 2,
  port: 3000,
  host: '0.0.0.0',
  //Cookie
  cookie: true,
  cookieSecret: 'alabama',
  cookieParseOptions: {},
  // Cors
  cors: true,
  corsOrigin: /.+/,
  corsAlllowCredential: true,
  // Compression
  compress: true,
  // health: false,
  health: {
    maxEventLoopDelay: 100_000,
    maxHeapUsedBytes: 10_000_000_000,
    maxRssBytes: 10_000_000_000,
    maxEventLoopUtilization: 0.999,
    exposeStatusRoute: {
      routeOpts: {},
      routeResponseSchemaOpts: {
        eventLoopDelay: { type: 'number' },
        rssBytes: { type: 'number' },
        heapUsed: { type: 'number' },
        eventLoopUtilized: { type: 'number' },
        connectionStatus: { type: 'number' },
        dbStats: {
          type: 'array',
          items: {
            size: { type: 'number' },
            count: { type: 'number' },
            ok: { type: 'number' },
            storageSize: { type: 'number' },
            freeStorageSize: { type: 'number' },
            ns: { type: 'string' },
            name: { type: 'string' }
          }
        }
      },
      url: '/health'
    },
    healthCheck: async function (server: FastifyInstance) {
      // do some magic to check if your db connection is healthy, etc...
      return {
        ...server.memoryUsage(),
        ...(await server.databaseConnectionStatus())
      };
    },
    healthCheckInterval: 500
  },
  limit: {
    global: true,
    max: 300,
    timeWindow: '1 minute'
  }
};

const defaultParamsProxyHandler: ProxyHandler<ServerParams> = {
  get: function (object, key) {
    return object.hasOwnProperty(key)
      ? object[key]
      : defaultServerParams[key];
  },
  set: function () {
    return false;
  },
  has: function (object, key) {
    return key in object;
  }
};

export default function Server(
  plugins: FastifyPluginAsync[] = [],
  params: Partial<ServerParams> = {}
): [FastifyInstance, ServerStartFunction] {
  console.log('Launching...');
  const options = new Proxy(params, defaultParamsProxyHandler) as ServerParams;
  const fastify = fast({
    logger: options.logger,
    ignoreTrailingSlash: options.ignoreTrailingSlash,
    bodyLimit: options.bodyLimit,
    ajv: {
      customOptions: { removeAdditional: false, allErrors: true }
    }
  });

  if (options.health) fastify.register(health, options.health);

  if (options.limit) {
    fastify.register(rateLimit, options.limit);
    fastify.after(() =>
      fastify.setNotFoundHandler(
        {
          preHandler: fastify.rateLimit()
        },
        function (_: FastifyRequest, reply: FastifyReply) {
          reply.code(404).send({ hello: 'world' });
        }
      )
    );
  }

  if (options.cors)
    fastify.register(cors, {
      origin: options.corsOrigin,
      credentials: options.corsAlllowCredential
    });

  if (options.compress)
    fastify.register(compress, {
      global: true,
      encodings: ['gzip', 'deflate']
    });

  if (options.cookie)
    fastify.register(cookie, {
      secret: options.cookieSecret,
      parseOptions: options.cookieParseOptions
    } as FastifyCookieOptions);

  for (const plugin of plugins) {
    fastify.register(plugin);
  }

  function start(i: number): Promise<void> {
    return fastify
      .listen({
        port: options.port,
        host: options.host
      })
      .then(() => {
        console.log(fastify.printRoutes());
        console.log(fastify.printPlugins());
      })
      .catch((err: any) => {
        fastify.log.error(err);
        if (!i) return process.exit(1);
        return new Promise((r) =>
          setTimeout(() => start(i - 1).then(r), 3000)
        );
      });
  }

  return [fastify, start];
}
