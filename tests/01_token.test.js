import AoLoader from '@permaweb/ao-loader';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs';
import { evaluate, sortByKey } from './utils';

const wasm = fs.readFileSync('./process.wasm');
const liteseed = fs.readFileSync('./src/liteseed.lua', 'utf-8');

const environment = { Process: { Id: "DUMMY-PROCESS-ID", Tags: [] } };

describe("Token", () => {
  let loaded;
  let handle;

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
    // TODO: ADD EXPECT ASSERT ERROR CALLER NOT OWNER
    const result1 = handle(loaded.memory, message1, environment);
    console.log(result1.Error);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });
  });


  test("Mint - Quantity is Required", async () => {
    const message1 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Mint" },
        { name: "Quantity", value: "0" }
      ],
    };
    // TODO: ADD EXPECT ASSERT ERROR QUANTITY == 0
    const result1 = handle(loaded.memory, message1, environment);
    console.log(result1.Error);

    const message2 = evaluate("Balances")
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID" : 100000000 })
  });

  test("Transfer - No Cast", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"},
      ],
    };
    const result1 = handle(loaded.memory, message1, environment);
    expect(result1.Messages[0].Tags.sort(sortByKey)).toEqual([
      { value: "ao", name: "Data-Protocol"}, 
      { value: "ao.TN.1", name: "Variant"}, 
      { value: "Message", name: "Type"}, 
      { value: "DUMMY-PROCESS-ID", name: "From-Process"}, 
      { value: "", name: "From-Module"}, 
      { value: "1", name: "Ref_"},
      { value: "Debit-Notice", name: "Action"},
      { value: "SOME-PROCESS-ID", name: "Recipient"},
      { value: "100", name: "Quantity"}
    ].sort(sortByKey));
    expect(result1.Messages[1].Tags.sort(sortByKey)).toEqual(
      [
        { value: "ao",  name: "Data-Protocol"}, 
        { value: "ao.TN.1", name: "Variant"},
        { value: "Message", name: "Type"},
        { value: "DUMMY-PROCESS-ID", name: "From-Process"}, 
        { value: "", name: "From-Module"}, 
        { value: "2", name: "Ref_"}, 
        { value: "Credit-Notice", name: "Action"}, 
        { value: "100", name: "Quantity"}, 
        { value: "DUMMY-PROCESS-ID", name: "Sender"}
      ].sort(sortByKey));
    expect(result1.Output).toEqual([]);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID" : 100 });
  });

  test("Transfer - Cast", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"},
        { name: "Cast", value: "true"},
      ],
    };

    const result1 = handle(loaded.memory, message1, environment);
    expect(result1.Messages).toEqual([]);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 99999900, "SOME-PROCESS-ID" : 100 });
  });


  test("Transfer - Quantity is not defined", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = {
      From: "DUMMY-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "0" },
        { name: "Recipient", value: "SOME-PROCESS-ID"},
      ],
    };
    // TODO: Add expect for assert
    handle(loaded.memory, message1, environment);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });
  });


  test("Transfer - Caller not owner", async () => {
    const message0 = evaluate("Balances");
    const result0 = handle(loaded.memory, message0, environment);
    expect(result0.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });

    const message1 = {
      From: "SOME-PROCESS-ID",
      Tags: [
        { name: "Action", value: "Transfer" },
        { name: "Quantity", value: "100" },
        { name: "Recipient", value: "SOME-PROCESS-ID"},
      ],
    };
    // TODO: Add expect for assert
    handle(loaded.memory, message1, environment);

    const message2 = evaluate("Balances");
    const result2 = handle(loaded.memory, message2, environment);
    expect(result2.Output.data.json).toEqual({ "DUMMY-PROCESS-ID": 100000000 });
  });

});
