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
      { name: "Url", value: "http://localhost" },
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
    data: "DATA_ITEM_ID",
    tags: [
      { name: "Action", value: "Initiate" },
      { name: "Size", value: "104857600" },
    ],
  });
  const upload = generateMessage({
    target: PROCESS_ID,
    from: USER_ID,
    data: "DATA_ITEM_ID",
    tags: [
      { name: "Action", value: "Upload" },
    ],
  });
  const uploads = generateMessage({
    target: PROCESS_ID,
    from: USER_ID,
    tags: [{ name: "Action", value: "Uploads" }],
  });
  const posted = generateMessage({
    target: PROCESS_ID,
    from: BUNDLER_PROCESS_ID,
    data: "DATA_ITEM_ID",
    tags: [
      { name: "Action", value: "Posted" },
      { name: "Transaction", value: "TRANSACTION_ID" }
    ],
  });

  const release = generateMessage({
    target: PROCESS_ID,
    from: BUNDLER_PROCESS_ID,
    data: "DATA_ITEM_ID",
    tags: [
      { name: "Action", value: "Release" },
    ],
  });

  beforeEach(async () => {
    // Load AO Loader
    handle = await AoLoader(wasm, {
      format: "wasm64-unknown-emscripten-draft_2024_02_15", inputEncoding: "JSON-1",
      outputEncoding: "JSON-1",
      memoryLimit: "524288000", // in bytes
      computeLimit: 9e12.toString(),
    }, {});

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
      PROCESS_ID: "99999000",
      BUNDLER_PROCESS_ID: "1000",
    });
  });

  describe("Stake", () => {
    test("Success", async () => {
      process = handle(process.Memory, stakeBundler, ENVIRONMENT);
      process = handle(process.Memory, balances, ENVIRONMENT);

      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "100000000",
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
      assert.match(process.Error, /Insufficient\ Balance/);

      process = handle(process.Memory, balances, ENVIRONMENT);

      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "99999100",
        BUNDLER_PROCESS_ID: "900",
      });

      process = handle(process.Memory, stakers, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
    });

    test("Fail - Invalid URL - null", async () => {
      const copyStakeBundler = structuredClone(stakeBundler);
      copyStakeBundler.Tags[1].value = null;
      process = handle(process.Memory, copyStakeBundler, ENVIRONMENT);
      assert.match(process.Error, /Invalid\ URL/);

      process = handle(process.Memory, balances, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "99999000",
        BUNDLER_PROCESS_ID: "1000",
      });

      process = handle(process.Memory, stakers, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
    });

    test('Fail - Invalid URL - ""', async () => {
      const copyStakeBundler = structuredClone(stakeBundler);
      copyStakeBundler.Tags[1].value = "";
      process = handle(process.Memory, copyStakeBundler, ENVIRONMENT);
      assert.match(process.Error, /Invalid\ URL/);

      process = handle(process.Memory, balances, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "99999000",
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
        PROCESS_ID: "99999000",
        BUNDLER_PROCESS_ID: "1000",
      });

      process = handle(process.Memory, stakers, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
    });

    test("Fail - Not Staked", async () => {
      process = handle(process.Memory, unstakeBundler, ENVIRONMENT);
      process = handle(process.Memory, unstakeBundler, ENVIRONMENT);

      assert.match(process.Error, /Not\ Staked/);

      process = handle(process.Memory, balances, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "99999000",
        BUNDLER_PROCESS_ID: "1000",
      });
    });
  });

  describe("Initiate", () => {
    beforeEach(async () => {
      process = handle(process.Memory, stakeBundler, ENVIRONMENT);
    });

    test("Success", async () => {
      process = handle(process.Memory, initiateUpload, ENVIRONMENT);

      process = handle(process.Memory, balances, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "100000000",
        BUNDLER_PROCESS_ID: "0",
      });

      process = handle(process.Memory, upload, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        block: "100",
        bundler: "BUNDLER_PROCESS_ID",
        size: "104857600",
        paid: '',
        status: "0",
      });
    });

    test("Fail - No DataItem ID", async () => {
      const message = structuredClone(initiateUpload);
      message.Data = "";

      process = handle(process.Memory, message, ENVIRONMENT);
      assert.match(process.Error, /Invalid DataItem ID/);

      process = handle(process.Memory, balances, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "100000000",
        BUNDLER_PROCESS_ID: "0",
      });
    });

    test("Fail - No Size", async () => {
      const message = structuredClone(initiateUpload);
      message.Tags[1].value = "";

      process = handle(process.Memory, message, ENVIRONMENT);
      assert.match(
        process.Error,
        /value cannot be represented by a bint/,
      );

      message.Tags[1].value = "0";
      process = handle(process.Memory, message, ENVIRONMENT);
      assert.match(process.Error, /Invalid Size/);

      process = handle(process.Memory, balances, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        PROCESS_ID: "100000000",
        BUNDLER_PROCESS_ID: "0",
      });
      process = handle(process.Memory, uploads, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), []);
    });

  });

  describe("Posted", () => {
    beforeEach(async () => {
      process = handle(process.Memory, stakeBundler, ENVIRONMENT);
      process = handle(process.Memory, initiateUpload, ENVIRONMENT);
    });

    test("Success", async () => {
      process = handle(process.Memory, posted, ENVIRONMENT);
      process = handle(process.Memory, upload, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        block: "100",
        bundler: "BUNDLER_PROCESS_ID",
        size: "104857600",
        status: "1",
        paid: "",
        transaction: "TRANSACTION_ID"
      });
    });
    test("Fail - Invalid DataItem ID", async () => {
      const message = structuredClone(posted);
      message.Data = "";
      process = handle(process.Memory, message, ENVIRONMENT);
      assert.match(process.Error, /Invalid DataItem ID/);
      process = handle(process.Memory, upload, ENVIRONMENT);
      assert.deepEqual(JSON.parse(process.Messages[0].Data), {
        block: "100",
        bundler: "BUNDLER_PROCESS_ID",
        size: "104857600",
        paid: "",
        status: "0",
      });
    });
    test("Fail - Not Assigned", async () => {
      const message = structuredClone(posted);
      message.From = "NEW_PROCESS";

      process = handle(process.Memory, message, ENVIRONMENT);
      assert.match(process.Error, /Not assigned/);
    });
    test("Fail - Upload already complete", async () => {
      process = handle(process.Memory, posted, ENVIRONMENT);
      process = handle(process.Memory, release, ENVIRONMENT);
      process = handle(process.Memory, posted, ENVIRONMENT);
      assert.match(process.Error, /Invalid Action/);
    });
  });

  // describe("Release", () => {
  //   beforeEach(async () => {
  //     process = handle(process.Memory, stakeBundler, ENVIRONMENT);
  //     process = handle(process.Memory, initiateUpload, ENVIRONMENT);
  //     process = handle(process.Memory, posted, ENVIRONMENT);
  //   });

  //   test("Success", async () => {
  //     process = handle(process.Memory, release, ENVIRONMENT);
  //     process = handle(process.Memory, balances, ENVIRONMENT);
  //     assert.deepEqual(JSON.parse(process.Messages[0].Data), {
  //       PROCESS_ID: "99999990",
  //       BUNDLER_PROCESS_ID: "10",
  //     });
  //   });
  //   test("Fail - Invalid DataItemId", async () => {
  //     const message = structuredClone(release);
  //     message.Tags[1].value = "";
  //     process = handle(process.Memory, message, ENVIRONMENT);
  //     assert.match(process.Output.data.output, /Invalid DataItemId/);
  //   });
  //   test("Fail - Upload incomplete", async () => {
  //     const message1 = structuredClone(initiateUpload);
  //     message1.Tags[1].value = "NEW_DATA_ITEM_ID";
  //     process = handle(process.Memory, message1, ENVIRONMENT);
  //     const message2 = structuredClone(release);
  //     message2.Tags[1].value = "NEW_DATA_ITEM_ID";
  //     process = handle(process.Memory, message2, ENVIRONMENT);
  //     assert.match(process.Output.data.output, /Upload incomplete/);
  //   });
  // });
});
