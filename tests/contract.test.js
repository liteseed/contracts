import AoLoader from "@permaweb/ao-loader";
import { describe, test, beforeEach } from "node:test";
import * as assert from "node:assert";
import fs from "fs";
import { spawn, generateMessage } from "./utils.js";

const wasm = fs.readFileSync("./process.wasm");
const contractFile = fs.readFileSync("./src/contract.lua", "utf-8");

const PROCESS_ID = "PROCESS_ID";
const BUNDLER_PROCESS_ID = "BUNDLER_PROCESS_ID";
const USER_ID = "USER_ID";

const ENVIRONMENT = {
	Process: {
		Id: PROCESS_ID,
		Owner: "PROCESS_OWNER_ID",
		Tags: [],
	},
};

describe("Contract", () => {
	/** @type {{ Memory: Uint8Array; Messages: any; Output: any; Spawns: any; Errors: any; GasUsed: bigint; }} */
	let process;

	/** @type {{ Memory: Uint8Array; Messages: any; Output: any; Spawns: any; Errors: any; GasUsed: bigint; }} */
	let handle;

	// Actions
	const balances = generateMessage({
		target: PROCESS_ID,
		from: BUNDLER_PROCESS_ID,
		tags: [{ name: "Action", value: "Balances" }],
	});
	const transferToBundler = generateMessage({
		target: PROCESS_ID,
		from: PROCESS_ID,
		tags: [
			{ name: "Action", value: "Transfer" },
			{ name: "Recipient", value: BUNDLER_PROCESS_ID },
			{ name: "Quantity", value: "1000" },
		],
	});
	const transferToUser = generateMessage({
		target: PROCESS_ID,
		from: PROCESS_ID,
		tags: [
			{ name: "Action", value: "Transfer" },
			{ name: "Recipient", value: USER_ID },
			{ name: "Quantity", value: "1000" },
		],
	});
	const stakers = generateMessage({
		target: PROCESS_ID,
		from: BUNDLER_PROCESS_ID,
		tags: [{ name: "Action", value: "Stakers" }],
	});
	const stakeBundler = generateMessage({
		target: PROCESS_ID,
		from: BUNDLER_PROCESS_ID,
		tags: [
			{ name: "Action", value: "Stake" },
			{ name: "URL", value: "http://localhost" },
		],
	});

	const unstakeBundler = generateMessage({
		target: PROCESS_ID,
		from: BUNDLER_PROCESS_ID,
		tags: [{ name: "Action", value: "Unstake" }],
	});

	const initiateUpload = generateMessage({
		target: PROCESS_ID,
		from: USER_ID,
		tags: [
			{ name: "Action", value: "Initiate" },
			{ name: "DataItemId", value: "DATA_ITEM_ID" },
			{ name: "Quantity", value: "100" },
		],
	});
	const upload = generateMessage({
		target: PROCESS_ID,
		from: USER_ID,
		tags: [
			{ name: "Action", value: "Upload" },
			{ name: "DataItemId", value: "DATA_ITEM_ID" },
		],
	});
	const uploads = generateMessage({
		target: PROCESS_ID,
		from: USER_ID,
		tags: [{ name: "Action", value: "Uploads" }],
	});
	const updateStatus = generateMessage({
		target: PROCESS_ID,
		from: BUNDLER_PROCESS_ID,
		tags: [
			{ name: "Action", value: "UpdateStatus" },
			{ name: "DataItemId", value: "DATA_ITEM_ID" },
			{ name: "Status", value: "3" },
		],
	});

	const releaseReward = generateMessage({
		target: PROCESS_ID,
		from: BUNDLER_PROCESS_ID,
		tags: [
			{ name: "Action", value: "Release" },
			{ name: "DataItemId", value: "DATA_ITEM_ID" },
		],
	});

	beforeEach(async () => {
		// Load AO Loader
		handle = await AoLoader(wasm);

		// Load Token
		process = handle(
			null,
			spawn({ data: contractFile, env: ENVIRONMENT }),
			ENVIRONMENT,
		);
		process = handle(process.Memory, transferToBundler, ENVIRONMENT);

		// SANITY CHECK - Check Balances
		process = handle(process.Memory, balances, ENVIRONMENT);
		assert.deepEqual(JSON.parse(process.Messages[0].Data), {
			PROCESS_ID: "999999999999999000",
			BUNDLER_PROCESS_ID: "1000",
		});
	});

	describe("Stake", () => {
		test("Success", async () => {
			process = handle(process.Memory, stakeBundler, ENVIRONMENT);
			process = handle(process.Memory, balances, ENVIRONMENT);

			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "1000000000000000000",
				BUNDLER_PROCESS_ID: "0",
			});

			process = handle(process.Memory, stakers, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), [
				{
					id: BUNDLER_PROCESS_ID,
					reputation: 1000,
					url: stakeBundler.Tags[1].value,
				},
			]);
		});
		test("Fail - Insufficient Balance", async () => {
			process = handle(
				process.Memory,
				generateMessage({
					target: PROCESS_ID,
					from: BUNDLER_PROCESS_ID,
					tags: [
						{ name: "Action", value: "Transfer" },
						{ name: "Recipient", value: PROCESS_ID },
						{ name: "Quantity", value: "100" },
					],
				}),
				ENVIRONMENT,
			);

			process = handle(process.Memory, stakeBundler, ENVIRONMENT);
			assert.match(process.Output.data.output, /Insufficient\ Balance/);

			process = handle(process.Memory, balances, ENVIRONMENT);

			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999100",
				BUNDLER_PROCESS_ID: "900",
			});

			process = handle(process.Memory, stakers, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
		});

		test("Fail - Invalid URL - null", async () => {
			const copyStakeBundler = structuredClone(stakeBundler);
			copyStakeBundler.Tags[1].value = null;
			process = handle(process.Memory, copyStakeBundler, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid\ URL/);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "1000",
			});

			process = handle(process.Memory, stakers, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
		});

		test('Fail - Invalid URL - ""', async () => {
			const copyStakeBundler = structuredClone(stakeBundler);
			copyStakeBundler.Tags[1].value = "";
			process = handle(process.Memory, copyStakeBundler, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid\ URL/);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "1000",
			});

			process = handle(process.Memory, stakers, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
		});
	});

	describe("Unstake", () => {
		beforeEach(async () => {
			process = handle(process.Memory, stakeBundler, ENVIRONMENT);
		});

		test("Success", async () => {
			process = handle(process.Memory, unstakeBundler, ENVIRONMENT);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "1000",
			});

			process = handle(process.Memory, stakers, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
		});

		test("Fail - Not Staked", async () => {
			process = handle(process.Memory, unstakeBundler, ENVIRONMENT);
			process = handle(process.Memory, unstakeBundler, ENVIRONMENT);

			assert.match(process.Output.data.output, /Not\ Staked/);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "1000",
			});
		});
	});
	describe("Initiate", () => {
		beforeEach(async () => {
			process = handle(process.Memory, transferToUser, ENVIRONMENT);
			process = handle(process.Memory, stakeBundler, ENVIRONMENT);
		});

		test("Success", async () => {
			process = handle(process.Memory, initiateUpload, ENVIRONMENT);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999100",
				BUNDLER_PROCESS_ID: "0",
				USER_ID: "900",
			});

			process = handle(process.Memory, upload, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				block: "100",
				bundler: 1,
				quantity: "100",
				status: 0,
			});
		});

		test("Fail - No DataItem Id", async () => {
			const message = structuredClone(initiateUpload);
			message.Tags[1].value = "";

			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid DataItemId/);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "0",
				USER_ID: "1000",
			});
		});
		test("Fail - No Quantity", async () => {
			const message = structuredClone(initiateUpload);
			message.Tags[2].value = "";

			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(
				process.Output.data.output,
				/value cannot be represented by a bint/,
			);

			message.Tags[2].value = "0";
			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid Quantity/);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "0",
				USER_ID: "1000",
			});
			process = handle(process.Memory, uploads, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
		});

		test("Fail - Insufficient Balance", async () => {
			const message = structuredClone(initiateUpload);
			message.Tags[2].value = "1001";

			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Insufficient Balance/);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "0",
				USER_ID: "1000",
			});
			process = handle(process.Memory, uploads, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
		});
	});
	describe("UpdateStatus", () => {
		beforeEach(async () => {
			process = handle(process.Memory, transferToUser, ENVIRONMENT);
			process = handle(process.Memory, stakeBundler, ENVIRONMENT);
			process = handle(process.Memory, initiateUpload, ENVIRONMENT);
		});

		test("Success", async () => {
			process = handle(process.Memory, updateStatus, ENVIRONMENT);
			process = handle(process.Memory, upload, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				block: "100",
				bundler: 1,
				quantity: "100",
				status: 3,
			});
		});
		test("Fail - Invalid DataItemId", async () => {
			const message = structuredClone(updateStatus);
			message.Tags[1].value = "";
			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid DataItemId/);
			process = handle(process.Memory, upload, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				block: "100",
				bundler: 1,
				quantity: "100",
				status: 0,
			});
		});
		test("Fail - Invalid Status", async () => {
			const message = structuredClone(updateStatus);
			message.Tags[2].value = "";
			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid Status/);
			message.Tags[2].value = "-2";
			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid Status/);
			message.Tags[2].value = "4";
			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid Status/);

			process = handle(process.Memory, upload, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				block: "100",
				bundler: 1,
				quantity: "100",
				status: 0,
			});
		});
		test("Fail - Not Owner", async () => {
			const message = structuredClone(updateStatus);
			message.From = "NEW_PROCESS";

			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Not Assigned/);
		});
		test("Fail - Upload already complete", async () => {
			const message = structuredClone(updateStatus);
			message.Tags[2].value = "3";

			process = handle(process.Memory, message, ENVIRONMENT);
			process = handle(process.Memory, message, ENVIRONMENT);

			assert.match(process.Output.data.output, /Upload Already Complete/);
		});
	});

	describe("Release", () => {
		beforeEach(async () => {
			process = handle(process.Memory, transferToUser, ENVIRONMENT);
			process = handle(process.Memory, stakeBundler, ENVIRONMENT);
			process = handle(process.Memory, initiateUpload, ENVIRONMENT);
			process = handle(process.Memory, updateStatus, ENVIRONMENT);
		});

		test("Success", async () => {
			process = handle(process.Memory, releaseReward, ENVIRONMENT);

			process = handle(process.Memory, balances, ENVIRONMENT);
			assert.deepEqual(JSON.parse(process.Messages[0].Data), {
				PROCESS_ID: "999999999999999000",
				BUNDLER_PROCESS_ID: "100",
				USER_ID: "900",
			});
		});
		test("Fail - Invalid DataItemId", async () => {
			const message = structuredClone(releaseReward);
			message.Tags[1].value = "";
			process = handle(process.Memory, message, ENVIRONMENT);
			assert.match(process.Output.data.output, /Invalid DataItemId/);
		});
		test("Fail - Upload incomplete", async () => {
			const message1 = structuredClone(initiateUpload);
			message1.Tags[1].value = "NEW_DATA_ITEM_ID";
			process = handle(process.Memory, message1, ENVIRONMENT);
			const message2 = structuredClone(releaseReward);
			message2.Tags[1].value = "NEW_DATA_ITEM_ID";
			process = handle(process.Memory, message2, ENVIRONMENT);
			assert.match(process.Output.data.output, /Upload incomplete/);
		});
	});
});
