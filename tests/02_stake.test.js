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
    const message = evaluate("Stakers")
    const result = handle(loaded.memory, message, env);
    expect(result.Output.data.json).toEqual([]);
  });

  test("Stake", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, env);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = evaluate("Stakers");
    const result1 = handle(loaded.memory, message1, env);
    expect(result1.Output.data.json).toEqual([]);


    const message2 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"}
      ],
    };
    handle(loaded.memory, message2, env);

    const message3 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "100" },
      ],
    };
    handle(loaded.memory, message3, env);

    const message4 = evaluate("Balances");
    const result4 = handle(loaded.memory, message4, env);
    expect(result4.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });

    const message5 = evaluate("Stakers");
    const result5 = handle(loaded.memory, message5, env);
    expect(result5.Output.data.json).toEqual({"SOME-PROCESS-ID": { "amount": 100}});
  });

  test("Stake - Minimum Staking Quantity", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, env);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = evaluate("Stakers");
    const result1 = handle(loaded.memory, message1, env);
    expect(result1.Output.data.json).toEqual([]);

    const message2 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"}
      ],
    };
    handle(loaded.memory, message2, env);

    const message3 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "99" },
      ],
    };
    handle(loaded.memory, message3, env);

    const message4 = evaluate("Balances");
    const result4 = handle(loaded.memory, message4, env);
    expect(result4.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });

    const message5 = evaluate("Stakers");
    const result5 = handle(loaded.memory, message5, env);
    expect(result5.Output.data.json).toEqual([]);
  });

  test("Stake - Insufficient Balance", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, env);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = evaluate("Stakers");
    const result1 = handle(loaded.memory, message1, env);
    expect(result1.Output.data.json).toEqual([]);

    const message2 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"}
      ],
    };
    handle(loaded.memory, message2, env);

    const message3 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "99" },
      ],
    };
    handle(loaded.memory, message3, env);

    const message4 = evaluate("Balances");
    const result4 = handle(loaded.memory, message4, env);
    expect(result4.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });

    const message5 = evaluate("Stakers");
    const result5 = handle(loaded.memory, message5, env);
    expect(result5.Output.data.json).toEqual([]);
  });

});
