import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import { evaluate } from './utils';
import { env } from 'process';

const wasm = fs.readFileSync('./process.wasm');
const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

const environment = { Process: { Id: "CONTRACT-PROCESS-ID", Tags: [] } };

describe("Stake", () => {
  let loaded;
  let handle;

  // Actions

  const getBalances = evaluate("Balances");
  const getIndexedStakers = evaluate("IndexedStakers");
  const getStakers = evaluate("Stakers");
  const getReputations = evaluate("Reputations");

  const transfer = {
    From: "CONTRACT-PROCESS-ID",
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
    handle(loaded.memory, transfer, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("Stakers", async () => {
    const result = handle(loaded.memory, getStakers, environment);
    expect(result.Output.data.json).toEqual([]);
  });

  test("Stake", async () => {
    const stake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 100,
    };
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });

  test("Minimum Staking Quantity", async () => {
    const stake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "99" },
      ],
    };
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("Insufficient Balance", async () => {
    const stake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Stake" },
        { name: "Quantity", value: "101" },
      ],
    };
    handle(loaded.memory, stake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

});

describe("Unstake", () => {
  let loaded;
  let handle;


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
    From: "CONTRACT-PROCESS-ID",
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
    handle(loaded.memory, transfer, environment);
    handle(loaded.memory, stake, environment);
  });

  test("Unstake", async () => {
    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 300
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("No Stake", async () => {
    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 300
    };
    handle(loaded.memory, unstake, environment); // UNSTAKED
    handle(loaded.memory, unstake, environment); // NO STAKE EXISTS

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 100 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual([]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual([]);
  });

  test("Requested amount greater than staked amount", async () => {

    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "101" },
      ],
      'Block-Height': 300
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });

  test("Time delay not expired", async () => {
    const unstake = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Unstake" },
        { name: "Quantity", value: "100" },
      ],
      'Block-Height': 101
    };
    handle(loaded.memory, unstake, environment);

    expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999900, "SOME-PROCESS-ID": 0 });
    expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({"SOME-PROCESS-ID": { amount: 100, stakedAt: 100}});
    expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["SOME-PROCESS-ID"]);
    expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "SOME-PROCESS-ID" : 1000});
  });
});
