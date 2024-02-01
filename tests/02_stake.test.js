import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import { evaluate } from './utils';

const wasm = fs.readFileSync('./process.wasm');
const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

const env = { Process: { Id: "DUMMY-PROCESS-ID", Tags: [] } };

describe("Staking", () => {
  let loaded, handle;

  beforeEach(async () => {
    loaded = evaluate(liteseed);
    handle = await AoLoader(wasm);
    handle(null, loaded, env);
  });

  test("Stakers", async () => {
    const msg = evaluate("Stakers")
    const result = handle(loaded.memory, msg, env);
    expect(result.Output.data.json).toBe({});
  });

  test("Stake", async () => {
    const msg0 = evaluate("Balances");
    const msg0Result = handle(loaded.memory, msg0, env);
    expect(msg0Result.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const msg1 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" },
        { name: "Quantity", value: "100" }
      ],
    };
    handle(loaded.memory, msg1, env);

    const msg2 = evaluate("Balances");
    const msg2Result = handle(loaded.memory, msg2, env);
    expect(msg2Result.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000100 });
  });


  test("Mint - Caller not owner", async () => {
    const msg0 = evaluate("Balances");
    const msg0Result = handle(loaded.memory, msg0, env);
    expect(msg0Result.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const msg1 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" },
        { name: "Quantity", value: "100" }
      ],
    };
    const msg1Result = handle(loaded.memory, msg1, env);
    console.log(msg1Result);

    const msg2 = evaluate("Balances");
    const msg2Result = handle(loaded.memory, msg2, env);
    expect(msg2Result.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });
  });


  test("Mint - Quantity is Required", async () => {
    const loaded = evaluate(liteseed);
    const handle = await AoLoader(wasm);
    handle(null, loaded, env);

    const msg = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" }
      ],
    };
    // MINT ASSERT ERROR QUANTITY == 0
    const result = handle(loaded.memory, msg, env);
    // undefined
    // console.log(result.Error);
  });
});