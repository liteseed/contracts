// import AoLoader from '@permaweb/ao-loader';
// import { beforeEach, describe, expect, test } from 'bun:test';
// import fs from 'fs';
// import { evaluate } from './utils';
// import { env } from 'process';

// const wasm = fs.readFileSync('./process.wasm');
// const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

// const environment = { Process: { Id: "CONTRACT-PROCESS-ID", Tags: [] } };

// describe("Punish", () => {
//   let loaded;
//   let handle;

//   // Actions

//   const getBalances = evaluate("Balances");
//   const getIndexedStakers = evaluate("IndexedStakers");
//   const getStakers = evaluate("Stakers");
//   const getReputations = evaluate("Reputations");

//   const transfer = (processId) => ({
//     From: "CONTRACT-PROCESS-ID",
//     Tags: [
//       { name: "Action", value: "Transfer" },
//       { name: "Quantity", value: "100" },
//       { name: "Recipient", value: processId}
//     ],
//     'Block-Height': "10",
//   });
 
//   const stake = (processId) => ({
//     From: processId,
//     Tags: [
//       { name: "Action", value: "Stake" },
//       { name: "Quantity", value: "100" },
//     ],
//     'Block-Height': 100,
//   });

//   beforeEach(async () => {
//     loaded = evaluate(liteseed);
//     handle = await AoLoader(wasm);
//     handle(null, loaded, environment);
//     handle(loaded.memory, transfer("PROCESS-ID-1"), environment);
//     handle(loaded.memory, stake("PROCESS-ID-1"), environment);
//     handle(loaded.memory, transfer("PROCESS-ID-2"), environment);
//     handle(loaded.memory, stake("PROCESS-ID-2"), environment);

//     expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999800, "PROCESS-ID-1": 0, "PROCESS-ID-2": 0 });
//     expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({
//       "PROCESS-ID-1": { amount: 100, stakedAt: 100}, 
//       "PROCESS-ID-2": { amount: 100, stakedAt: 100}
//     });
//     expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["PROCESS-ID-1", "PROCESS-ID-2"]);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1000, "PROCESS-ID-2": 1000});
//   });

//   test("Punish", async () => {
//     const punish = {
//       From: "CONTRACT-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Punish" },
//         { name: "StakerIndex", value: "1" },
//       ],
//       'Block-Height': 100,
//     };
//     handle(loaded.memory, punish, environment);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 900, "PROCESS-ID-2": 1000});
//   });

//   test("Caller Not Owner", async () => {
//     const punish = {
//       From: "NOT-CONTRACT-OWNER-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Punish" },
//         { name: "StakerIndex", value: "1" },
//       ],
//       'Block-Height': 100,
//     };
//     handle(loaded.memory, punish, environment);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1000, "PROCESS-ID-2": 1000});
//   });

//   test("Staker does not exist", async () => {
//     const punish = {
//       From: "CONTRACT-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Punish" },
//         { name: "StakerIndex", value: "3" },
//       ],
//       'Block-Height': 100,
//     };
//     handle(loaded.memory, punish, environment);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1000, "PROCESS-ID-2": 1000});
//   });

//   test.skip("Reputation does not exist", () => {});
// });


// describe("Reward", () => {
//   let loaded;
//   let handle;

//   // Actions

//   const getBalances = evaluate("Balances");
//   const getIndexedStakers = evaluate("IndexedStakers");
//   const getStakers = evaluate("Stakers");
//   const getReputations = evaluate("Reputations");

//   const transfer = (processId) => ({
//     From: "CONTRACT-PROCESS-ID",
//     Tags: [
//       { name: "Action", value: "Transfer" },
//       { name: "Quantity", value: "100" },
//       { name: "Recipient", value: processId}
//     ],
//     'Block-Height': "10",
//   });
 
//   const stake = (processId) => ({
//     From: processId,
//     Tags: [
//       { name: "Action", value: "Stake" },
//       { name: "Quantity", value: "100" },
//     ],
//     'Block-Height': 100,
//   });

//   beforeEach(async () => {
//     loaded = evaluate(liteseed);
//     handle = await AoLoader(wasm);
//     handle(null, loaded, environment);
//     handle(loaded.memory, transfer("PROCESS-ID-1"), environment);
//     handle(loaded.memory, stake("PROCESS-ID-1"), environment);
//     handle(loaded.memory, transfer("PROCESS-ID-2"), environment);
//     handle(loaded.memory, stake("PROCESS-ID-2"), environment);

//     expect(handle(loaded.memory, getBalances, environment).Output.data.json).toEqual({ "CONTRACT-PROCESS-ID": 99999800, "PROCESS-ID-1": 0, "PROCESS-ID-2": 0 });
//     expect(handle(loaded.memory, getStakers, environment).Output.data.json).toEqual({
//       "PROCESS-ID-1": { amount: 100, stakedAt: 100}, 
//       "PROCESS-ID-2": { amount: 100, stakedAt: 100}
//     });
//     expect(handle(loaded.memory, getIndexedStakers, environment).Output.data.json).toEqual(["PROCESS-ID-1", "PROCESS-ID-2"]);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1000, "PROCESS-ID-2": 1000});
//   });

//   test("Reward", async () => {
//     const reward = {
//       From: "CONTRACT-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Reward" },
//         { name: "StakerIndex", value: "1" },
//       ],
//       'Block-Height': 100,
//     };
//     handle(loaded.memory, reward, environment);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1100, "PROCESS-ID-2": 1000});
//   });

//   test("Caller Not Owner", async () => {
//     const reward = {
//       From: "NOT-CONTRACT-OWNER-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Reward" },
//         { name: "StakerIndex", value: "1" },
//       ],
//       'Block-Height': 100,
//     };
//     handle(loaded.memory, reward, environment);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1000, "PROCESS-ID-2": 1000});
//   });

//   test("Staker does not exist", async () => {
//     const reward = {
//       From: "CONTRACT-PROCESS-ID",
//       Tags: [
//         { name: "Action", value: "Reward" },
//         { name: "StakerIndex", value: "3" },
//       ],
//       'Block-Height': 100,
//     };
//     handle(loaded.memory, reward, environment);
//     expect(handle(loaded.memory, getReputations, environment).Output.data.json).toEqual({ "PROCESS-ID-1" : 1000, "PROCESS-ID-2": 1000});
//   });

//   test.skip("Reputation does not exist", () => {});
// });
