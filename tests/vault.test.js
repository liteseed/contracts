import AoLoader from "@permaweb/ao-loader";
import { describe, test, beforeEach } from "node:test";
import * as assert from "node:assert";
import fs from "fs";
import { spawn, generateMessage } from "./utils.js";

const wasm = fs.readFileSync("./process.wasm");
const tokenFile = fs.readFileSync("./src/token.lua", "utf-8");
const vaultFile = fs.readFileSync("./src/vault.lua", "utf-8");

const PROCESS = "PROCESS_ID";
const USER_PROCESS = "USER_PROCESS_ID";

const ENVIRONMENT = {
  Process: {
    Id: PROCESS,
    Owner: "PROCESS_OWNER_ID",
    Tags: [],
  },
};

describe("Vault", () => {

  /** @type {{ Memory: Uint8Array; Messages: any; Output: any; Spawns: any; Errors: any; GasUsed: bigint; }} */
  let process;


  /** @type {{ Memory: Uint8Array; Messages: any; Output: any; Spawns: any; Errors: any; GasUsed: bigint; }} */
  let handle;

  // Actions
  const balances = generateMessage({
    target: PROCESS,
    from: USER_PROCESS,
    tags: [{ name: "Action", value: "Balances" }],
  });
  const transfer = generateMessage({
    target: PROCESS,
    from: PROCESS,
    tags: [
      { name: "Action", value: "Transfer" },
      { name: "Recipient", value: USER_PROCESS },
      { name: "Quantity", value: "1000" },
    ],
  });
  const stakers = generateMessage({
    target: PROCESS,
    from: USER_PROCESS,
    tags: [{ name: "Action", value: "Stakers" }],
  });
  const indexedStakers = generateMessage({
    target: PROCESS,
    from: USER_PROCESS,
    tags: [{ name: "Action", value: "IndexedStakers" }],
  });


  beforeEach(async () => {
    // Load AO Loader
    handle = await AoLoader(wasm);

    // Load Token
    process = handle(
      null,
      spawn({ data: tokenFile, env: ENVIRONMENT }),
      ENVIRONMENT,
    );
    // Load Vault
    process = handle(
      process.Memory,
      spawn({ data: vaultFile, env: ENVIRONMENT }),
      ENVIRONMENT,
    );
    process = handle(process.Memory, transfer, ENVIRONMENT);

    // SANITY CHECK - Check Balances 
    const result = handle(process.Memory, balances, ENVIRONMENT);
    assert.deepEqual(JSON.parse(result.Messages[0].Data), {
      PROCESS_ID: "9999999999999000",
      USER_PROCESS_ID: "1000",
    });

  });

  test("Stakers", async () => {
    const message = generateMessage({
      target: PROCESS,
      from: USER_PROCESS,
      tags: [{ name: "Action", value: "Stakers" }],
    });
    const result = handle(process.Memory, message, ENVIRONMENT);
    assert.deepEqual(JSON.parse(result.Messages[0].Data), [])
  });
  test("IndexedStakers", async () => {
    const message = generateMessage({
      target: PROCESS,
      from: USER_PROCESS,
      tags: [{ name: "Action", value: "IndexedStakers" }],
    });
    const result = handle(process.Memory, message, ENVIRONMENT);
    assert.deepEqual(JSON.parse(result.Messages[0].Data), [])
  });

  test("Stake", async () => {
    const message = generateMessage({
      target: PROCESS,
      from: USER_PROCESS,
      tags: [{ name: "Action", value: "Stake" }],
    });
    process = handle(process.Memory, message, ENVIRONMENT);

    const response0 = handle(process.Memory, balances, ENVIRONMENT);
    assert.deepEqual(JSON.parse(response0.Messages[0].Data), {
      PROCESS_ID: "9999999999999000",
      USER_PROCESS_ID: "0",
    });

    const response1 = handle(process.Memory, stakers, ENVIRONMENT);
    assert.deepEqual(JSON.parse(response1.Messages[0].Data), {
      USER_PROCESS_ID: 1000
    });

    const response2 = handle(process.Memory, indexedStakers, ENVIRONMENT);
    assert.deepEqual(JSON.parse(response2.Messages[0].Data), [USER_PROCESS]);
  });

  test("Insufficient Balance", async () => {
    const message = generateMessage({
      target: PROCESS,
      from: "OTHER_USER_PROCESS",
      tags: [{ name: "Action", value: "Stake" }],
    });
    process = handle(process.Memory, message, ENVIRONMENT);
    const response0 = handle(process.Memory, balances, ENVIRONMENT);
    assert.deepEqual(JSON.parse(response0.Messages[0].Data), {
      PROCESS_ID: "9999999999999000",
      USER_PROCESS_ID: "1000",
    });

    const response1 = handle(process.Memory, stakers, ENVIRONMENT);
    assert.deepEqual(JSON.parse(response1.Messages[0].Data), []);
  });
});
