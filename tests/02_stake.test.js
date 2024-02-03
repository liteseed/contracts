import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import { evaluate } from './utils';
import { env } from 'process';

const wasm = fs.readFileSync('./process.wasm');
const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

const environment = { Process: { Id: "DUMMY-PROCESS-ID", Tags: [] } };

describe("Stake", () => {
  let loaded, handle;

  // Actions

  const getBalances = evaluate("Balances");
  const getIndexedStakers = evaluate("IndexedStakers");
  const getStakers = evaluate("Stakers");
  const getReputations = evaluate("Reputations");

  const transfer = {
    From: "DUMMY-PROCESS-ID",
    Tags: [
      { name: "Action", value: "Transfer" },
      { name: "Quantity", value: "100" },
      { name: "Recipient", value: "SOME-PROCESS-ID"},
    ],
    'Block-Height': "10",
  };


  beforeEach(async () => {
    loaded = evaluate(liteseed);
    handle = await AoLoader(wasm);
    handle(null, loaded, environment);
  });

  test("Stakers", async () => {
    const result = handle(loaded.memory, getStakers, environment);
    expect(result.Output.data.json).toEqual([]);
  });

  test("Stake", async () => {
    handle(loaded.memory, transfer, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);

    const stake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 100,
    };
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });

  test("Stake - Minimum Staking Quantity", async () => {
    handle(loaded.memory, transfer, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);

    const stake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "99" },
      ],
    };
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("Stake - Insufficient Balance", async () => {
    handle(loaded.memory, transfer, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);

    const stake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "101" },
      ],
    };
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

});

describe("Unstake", () => {
  let loaded, handle;


  const getBalances = evaluate("Balances");
  const getIndexedStakers = evaluate("IndexedStakers");
  const getStakers = evaluate("Stakers");
  const getReputations = evaluate("Reputations");

  const stake = {
    From: "SOME-PROCESS-ID",
    Tags: [
      { name: "Action", value: "Stake" },
      { name: "Quantity", value: "100" },
    ],
    'Block-Height': "100",
  };
  const transfer = {
    From: "DUMMY-PROCESS-ID",
    Tags: [
      { name: "Action", value: "Transfer" },
      { name: "Quantity", value: "100" },
      { name: "Recipient", value: "SOME-PROCESS-ID"},
    ],
    'Block-Height': "10",
  };

  beforeEach(async () => {
    loaded = evaluate(liteseed);
    handle = await AoLoader(wasm);
    handle(null, loaded, environment);
  });

  test("Unstake", async () => {
    handle(loaded.memory, transfer, environment);
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});

    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 300
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("Unstake - No Stake", async () => {
    handle(loaded.memory, transfer, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);

    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 300
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("Unstake - Requested amount greater than staked amount", async () => {
    handle(loaded.memory, transfer, environment);
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});

    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "101" },
      ],
      'Block-Height': 300
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });

  test("Unstake - Unstake time delay not expired", async () => {
    handle(loaded.memory, transfer, environment);
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});

    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 101
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });
});
