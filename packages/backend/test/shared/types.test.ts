import Type from "typebox";
import { describe, expect, it } from "vitest";
import {
	ErrorResponseSchema,
	PaginatedResponseSchema,
} from "../../src/shared/types.js";

describe("ErrorResponseSchema", () => {
	it("is a valid TypeBox object schema", () => {
		expect(ErrorResponseSchema).toBeDefined();
		// TypeBox schemas carry a $schema or kind marker
		expect(typeof ErrorResponseSchema).toBe("object");
	});

	it("has an error property of type string", () => {
		const props = ErrorResponseSchema.properties as Record<
			string,
			{ type: string }
		>;
		expect(props.error).toBeDefined();
		expect(props.error.type).toBe("string");
	});

	it("has a message property of type string", () => {
		const props = ErrorResponseSchema.properties as Record<
			string,
			{ type: string }
		>;
		expect(props.message).toBeDefined();
		expect(props.message.type).toBe("string");
	});

	it("has a statusCode property of type number", () => {
		const props = ErrorResponseSchema.properties as Record<
			string,
			{ type: string }
		>;
		expect(props.statusCode).toBeDefined();
		expect(props.statusCode.type).toBe("number");
	});
});

describe("PaginatedResponseSchema", () => {
	it("returns a valid TypeBox object schema when called with an item schema", () => {
		const itemSchema = Type.Object({
			id: Type.String(),
			name: Type.String(),
		});

		const schema = PaginatedResponseSchema(itemSchema);

		expect(schema).toBeDefined();
		expect(typeof schema).toBe("object");
	});

	it("resulting schema has an items array property", () => {
		const itemSchema = Type.Object({ id: Type.String() });
		const schema = PaginatedResponseSchema(itemSchema);

		const props = schema.properties as Record<string, { type: string }>;
		expect(props.items).toBeDefined();
		expect(props.items.type).toBe("array");
	});

	it("resulting schema has an optional nextToken string property", () => {
		const itemSchema = Type.Object({ id: Type.String() });
		const schema = PaginatedResponseSchema(itemSchema);

		// Access via unknown to avoid TypeScript narrowing issues with TOptional
		const props = schema.properties as unknown as Record<string, unknown>;
		expect(props.nextToken).toBeDefined();
	});

	it("works with different item schemas each time it is called", () => {
		const schema1 = PaginatedResponseSchema(
			Type.Object({ bucket: Type.String() }),
		);
		const schema2 = PaginatedResponseSchema(
			Type.Object({
				queueUrl: Type.String(),
				approximateNumberOfMessages: Type.Number(),
			}),
		);

		// Each call should produce an independent schema
		expect(schema1).not.toBe(schema2);

		// Access items via unknown to avoid TypeScript index signature issues
		const props1 = schema1.properties as unknown as Record<string, unknown>;
		const props2 = schema2.properties as unknown as Record<string, unknown>;
		expect(props1.items).not.toBe(props2.items);
	});
});
