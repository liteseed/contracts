import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import { evaluate } from './utils';

const wasm = fs.readFileSync('./process.wasm');
const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

const environment = { Process: { Id: "DUMMY-PROCESS-ID", Tags: [] } };

describe("Token", () => {
  let loaded, handle;

  beforeEach(async () => {
    loaded = evaluate(liteseed);
    handle = await AoLoader(wasm);
    handle(null, loaded, environment);
  });

  test("Name", async () => {
    const message = evaluate("Name")
    const result = handle(loaded.memory, message, environment);
    expect(result.Output.data.output).toBe("Liteseed");
  });

  test("Balances", async () => {
    const message = evaluate("Balances");
    const result = handle(loaded.memory, message, environment);
    expect(result.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });
  });


  test("Mint", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" },
        { name: "Quantity", value: "100" }
      ],
    };
    handle(loaded.memory, message1, environment);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000100 });
  });


  test("Mint - Caller not owner", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" },
        { name: "Quantity", value: "100" }
      ],
    };
    const result1 = handle(loaded.memory, message1, environment);
    console.log(result1);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });
  });


  test("Mint - Quantity is Required", async () => {
    const loaded = evaluate(liteseed);
    const handle = await AoLoader(wasm);
    handle(null, loaded, environment);


    const message = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" },
        { name: "Quantity", value: "0" }
      ],
    };
    // MINT ASSERT ERROR QUANTITY == 0
    const result = handle(loaded.memory, message, environment);
    console.log(result.Error);
    const result1 = handle(loaded.memory, evaluate("Errors"), environment);
    console.log(result1);
  });
});