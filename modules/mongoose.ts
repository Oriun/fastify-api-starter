/** @format */

import {
	FastifyInstance,
	FastifyPluginAsync /*, FastifyPluginOptions*/
} from 'fastify';
import fp from 'fastify-plugin';
import mongoose, { Model, Document } from 'mongoose';

type Models = {
	[key: string]: Model<any>;
};

declare module 'fastify' {
	interface FastifyInstance {
		databaseConnectionStatus: () => { connectionStatus: number };
	}
}
export default function MongoosePlugin(models: Models, uri: string) {
	const ConnectDB: FastifyPluginAsync<any> = async (
		fastify: FastifyInstance
	) => {
		try {
			mongoose.connection.on('connected', () => {
				fastify.log.info({ actor: 'MongoDB' }, 'connected');
			});
			mongoose.connection.on('disconnected', () => {
				fastify.log.error({ actor: 'MongoDB' }, 'disconnected');
			});
			mongoose.connection.on('error', (err: unknown) => {
				fastify.log.error({ actor: 'MongoDB', error: err }, 'error');
			});
			await mongoose.connect(uri);
			fastify.decorate('db', models);
			fastify.decorate('mongoose', mongoose);
			fastify.decorate('databaseConnectionStatus', async () => {
				let dbStats = [] as any[];
				if ([1, 2].includes(mongoose.connection.readyState))
					dbStats = await Promise.all(
						Object.entries(models).map(
							([name, model]) =>
								new Promise<any>((r) => {
									model.collection.stats((err, results) => {
										if (err || !results)
											return r([
												name,
												{
													error: true,
													message: err?.message
												}
											]);
										const {
											size,
											count,
											ok,
											storageSize,
											freeStorageSize,
											ns
										} = results;
										r({
											name,
											size,
											count,
											ok,
											storageSize,
											freeStorageSize,
											ns
										});
									});
								})
						)
					).catch((err) => {
						console.log(err);
						return [];
					});
				return {
					connectionStatus: mongoose.connection.readyState,
					dbStats
				};
			});
			return Promise.resolve();
		} catch (error) {
			console.error(error);
			return Promise.reject();
		}
	};

	return fp(ConnectDB, { name: 'module/mongoose' });
}
