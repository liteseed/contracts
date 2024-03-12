import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from '@jest/globals'
import fs from 'fs';
import { generateMessage } from './utils';

const wasm = fs.readFileSync('./process.wasm');
const tokenFile = fs.readFileSync("./src/token.lua", "utf-8")
const networkFile = fs.readFileSync('./src/network.lua', 'utf-8');

;

const env = {
  token: { Process: { Id: "TOKEN-PROCESS-ID", Tags: [] } },
  network: { Process: { Id: "NETWORK-PROCESS-ID", Tags: [] } },
  bundler: { Process: { Id: "BUNDLER-PROCESS-ID", Tags: [] } }
}


describe("Stake", () => {
  let loadedToken;
  let loadedNetwork;
  let handle;

  // Actions

  const getBalances = generateMessage("Balances", env.token.id, env.bundler.Id);
  const getIndexedStakers = generateMessage("IndexedStakers", env.network.Id, env.bundler.Id);
  const getStakers = generateMessage("Stakers", env.network.Id, env.bundler.Id);
  const getReputations = generateMessage("Reputations", env.network.Id, env.bundler.Id);



  beforeEach(async () => {
    // Load AO Loader
    handle = await AoLoader(wasm);
    loaded = handle(null, generateMessage(tokenFile), env.token);

    expect(handle(loadedToken.memory, getBalances, {}).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 100000000 });

    handle(loadedToken.memory, {
      From: env.token.id,
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: env.bundler.Id },
      ],
      'Block-Height': "10",
    }, env.bundler);
    expect(handle(loadedToken.memory, getBalances, env.bundler).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 100 });


    loadedNetwork = generateMessage(networkFile);
    handle(null, loadedNetwork, env.network);


    expect(handle(loadedToken.memory, getStakers, env.network).Output.data.json).toEqual([]);
    expect(handle(loadedToken.memory, getIndexedStakers, env.network).Output.data.json).toEqual([]);
    expect(handle(loadedToken.memory, getReputations, env.network).Output.data.json).toEqual([]);
  });

  test("Stakers", async () => {
    const result = handle(loadedNetwork.memory, getStakers, env.network);
    expect(result.Output.data.json).toEqual([]);
  });

  // test("Stake", async () => {
  //   const stake = {
  //     From: environments.bundler.id,
  //     Tags: [
  //       { name: "Action", value: "Stake" },
  //       { name: "Quantity", value: "100" },
  //     ],
  //     'Block-Height': 100,
  //   };
  //   handle(loadedNetwork.memory, stake, environments.network);

  //   expect(handle(loadedNetwork.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 0 });
  //   expect(handle(loadedNetwork.memory, getStakers, environments.network).Output.data.json).toEqual({ "BUNDLER-PROCESS-ID": { amount: 100, stakedAt: 100 } });
  //   expect(handle(loadedNetwork.memory, getIndexedStakers, environments.network).Output.data.json).toEqual(["BUNDLER-PROCESS-ID"]);
  //   expect(handle(loadedNetwork.memory, getReputations, environments.network).Output.data.json).toEqual({ "BUNDLER-PROCESS-ID": 1000 });
  // });

  // test("Minimum Staking Quantity", async () => {
  //   const stake = {
  //     From: "BUNDLER-PROCESS-ID",
  //     Tags: [
  //       { name: "Action", value: "Stake" },
  //       { name: "Quantity", value: "99" },
  //     ],
  //   };
  //   handle(loadedNetwork.memory, stake, environments.network);

  //   expect(handle(loadedNetwork.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 100 });
  //   expect(handle(loadedNetwork.memory, getStakers, environments.network).Output.data.json).toEqual([]);
  //   expect(handle(loadedNetwork.memory, getIndexedStakers, environments.network).Output.data.json).toEqual([]);
  //   expect(handle(loadedNetwork.memory, getReputations, environments.network).Output.data.json).toEqual([]);
  // });

  // test("Insufficient Balance", async () => {
  //   const stake = {
  //     From: "BUNDLER-PROCESS-ID",
  //     Tags: [
  //       { name: "Action", value: "Stake" },
  //       { name: "Quantity", value: "101" },
  //     ],
  //   };
  //   handle(loadedNetwork.memory, stake, environments.network);

  //   expect(handle(loadedNetwork.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 100 });
  //   expect(handle(loadedNetwork.memory, getStakers, environments.network).Output.data.json).toEqual([]);
  //   expect(handle(loadedNetwork.memory, getIndexedStakers, environments.network).Output.data.json).toEqual([]);
  //   expect(handle(loadedNetwork.memory, getReputations, environments.network).Output.data.json).toEqual([]);
  // });

});

// describe("Unstake", () => {
//   let loaded;
//   let handle;


//   const getBalances = evaluate("Balances");
//   const getIndexedStakers = evaluate("IndexedStakers");
//   const getStakers = evaluate("Stakers");
//   const getReputations = evaluate("Reputations");

//   const stake = {
//     From: "BUNDLER-PROCESS-ID",
//     Tags: [
//       { name: "Action", value: "Stake" },
//       { name: "Quantity", value: "100" },
//     ],
//     'Block-Height': "100",
//   };
//   const transfer = {
//     From: "TOKEN-PROCESS-ID",
//     Tags: [
//       { name: "Action", value: "Transfer" },
//       { name: "Quantity", value: "100" },
//       { name: "Recipient", value: "BUNDLER-PROCESS-ID" },
//     ],
//     'Block-Height': "10",
//   };

//   beforeEach(async () => {
//     loaded = evaluate(network);
//     handle = await AoLoader(wasm);
//     handle(null, loaded, environments.network);
//     handle(loaded.memory, transfer, environments.network);
//     handle(loaded.memory, stake, environments.network);
//   });

//   test("Unstake", async () => {
//     const unstake = {
//       From: "BUNDLER-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Unstake" },
//         { name: "Quantity", value: "100" },
//       ],
//       'Block-Height': 300
//     };
//     handle(loaded.memory, unstake, environments.network);

//     expect(handle(loaded.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 100 });
//     expect(handle(loaded.memory, getStakers, environments.network).Output.data.json).toEqual([]);
//     expect(handle(loaded.memory, getIndexedStakers, environments.network).Output.data.json).toEqual([]);
//     expect(handle(loaded.memory, getReputations, environments.network).Output.data.json).toEqual([]);
//   });

//   test("No Stake", async () => {
//     const unstake = {
//       From: "BUNDLER-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Unstake" },
//         { name: "Quantity", value: "100" },
//       ],
//       'Block-Height': 300
//     };
//     handle(loaded.memory, unstake, environments.network); // UNSTAKED
//     handle(loaded.memory, unstake, environments.network); // NO STAKE EXISTS

//     expect(handle(loaded.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 100 });
//     expect(handle(loaded.memory, getStakers, environments.network).Output.data.json).toEqual([]);
//     expect(handle(loaded.memory, getIndexedStakers, environments.network).Output.data.json).toEqual([]);
//     expect(handle(loaded.memory, getReputations, environments.network).Output.data.json).toEqual([]);
//   });

//   test("Requested amount greater than staked amount", async () => {

//     const unstake = {
//       From: "BUNDLER-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Unstake" },
//         { name: "Quantity", value: "101" },
//       ],
//       'Block-Height': 300
//     };
//     handle(loaded.memory, unstake, environments.network);

//     expect(handle(loaded.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 0 });
//     expect(handle(loaded.memory, getStakers, environments.network).Output.data.json).toEqual({ "BUNDLER-PROCESS-ID": { amount: 100, stakedAt: 100 } });
//     expect(handle(loaded.memory, getIndexedStakers, environments.network).Output.data.json).toEqual(["BUNDLER-PROCESS-ID"]);
//     expect(handle(loaded.memory, getReputations, environments.network).Output.data.json).toEqual({ "BUNDLER-PROCESS-ID": 1000 });
//   });

//   test("Time delay not expired", async () => {
//     const unstake = {
//       From: "BUNDLER-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Unstake" },
//         { name: "Quantity", value: "100" },
//       ],
//       'Block-Height': 101
//     };
//     handle(loaded.memory, unstake, environments.network);

//     expect(handle(loaded.memory, getBalances, environments.network).Output.data.json).toEqual({ "TOKEN-PROCESS-ID": 99999900, "BUNDLER-PROCESS-ID": 0 });
//     expect(handle(loaded.memory, getStakers, environments.network).Output.data.json).toEqual({ "BUNDLER-PROCESS-ID": { amount: 100, stakedAt: 100 } });
//     expect(handle(loaded.memory, getIndexedStakers, environments.network).Output.data.json).toEqual(["BUNDLER-PROCESS-ID"]);
//     expect(handle(loaded.memory, getReputations, environments.network).Output.data.json).toEqual({ "BUNDLER-PROCESS-ID": 1000 });
//   });
// });
