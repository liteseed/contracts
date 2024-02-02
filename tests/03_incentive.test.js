import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import { evaluate } from './utils';

const wasm = fs.readFileSync('./process.wasm');
const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

const environment = { Process: { Id: "DUMMY-PROCESS-ID", Tags: [] } };

describe("Staking", () => {
  let loaded, handle;

  beforeEach(async () => {
    loaded = evaluate(liteseed);
    handle = await AoLoader(wasm);
    handle(null, loaded, environment);
  });

  test("Stakers", async () => {
    const message = evaluate("Stakers")
    const result = handle(loaded.memory, message, environment);
    expect(result.Output.data.json).toEqual([]);
  });

  test("Stake", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = evaluate("Stakers");
    const result1 = handle(loaded.memory, message1, environment);
    expect(result1.Output.data.json).toEqual([]);


    const message2 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"}
      ],
    };
    handle(loaded.memory, message2, environment);

    const message3 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "100" },
      ],
    };
    handle(loaded.memory, message3, environment);

    const message4 = evaluate("Balances");
    const result4 = handle(loaded.memory, message4, environment);
    expect(result4.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });

    const message5 = evaluate("Stakers");
    const result5 = handle(loaded.memory, message5, environment);
    expect(result5.Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100}});

    const message6 = evaluate("IndexedStakers");
    const result6 = handle(loaded.memory, message6, environment);
    expect(result6.Output.data.json).toEqual(["SOME-PROCESS-ID"]);

    const message7 = evaluate("Reputations");
    const result7 = handle(loaded.memory, message7, environment);
    expect(result7.Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });

  test("Stake - Minimum Staking Quantity", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = evaluate("Stakers");
    const result1 = handle(loaded.memory, message1, environment);
    expect(result1.Output.data.json).toEqual([]);

    const message2 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"}
      ],
    };
    handle(loaded.memory, message2, environment);

    const message3 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "99" },
      ],
    };
    handle(loaded.memory, message3, environment);

    const message4 = evaluate("Balances");
    const result4 = handle(loaded.memory, message4, environment);
    expect(result4.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });

    const message5 = evaluate("Stakers");
    const result5 = handle(loaded.memory, message5, environment);
    expect(result5.Output.data.json).toEqual([]);
  });

  test("Stake - Insufficient Balance", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = evaluate("Stakers");
    const result1 = handle(loaded.memory, message1, environment);
    expect(result1.Output.data.json).toEqual([]);

    const message2 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"}
      ],
    };
    handle(loaded.memory, message2, environment);

    const message3 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "101" },
      ],
    };
    handle(loaded.memory, message3, environment);

    const message4 = evaluate("Balances");
    const result4 = handle(loaded.memory, message4, environment);
    expect(result4.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });

    const message5 = evaluate("Stakers");
    const result5 = handle(loaded.memory, message5, environment);
    expect(result5.Output.data.json).toEqual([]);
  });

});
