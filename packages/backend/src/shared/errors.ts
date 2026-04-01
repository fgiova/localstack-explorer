import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export class AppError extends Error {
	constructor(
		message: string,
		public statusCode: number = 500,
		public code: string = "INTERNAL_ERROR",
	) {
		super(message);
		this.name = "AppError";
	}
}

export function registerErrorHandler(app: FastifyInstance): void {
	app.setErrorHandler(
		(error: Error, _request: FastifyRequest, reply: FastifyReply) => {
			if (error instanceof AppError) {
				return reply.status(error.statusCode).send({
					error: error.code,
					message: error.message,
					statusCode: error.statusCode,
				});
			}

			// Fastify validation errors
			const fastifyError = error as {
				statusCode?: number;
				validation?: unknown;
			};
			if (fastifyError.statusCode && fastifyError.validation) {
				return reply.status(400).send({
					error: "VALIDATION_ERROR",
					message: error.message,
					statusCode: 400,
				});
			}

			app.log.error(error);
			return reply.status(500).send({
				error: "INTERNAL_ERROR",
				message: "An unexpected error occurred",
				statusCode: 500,
			});
		},
	);
}
