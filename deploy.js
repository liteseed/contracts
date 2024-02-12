import { createDataItemSigner, connect } from "@permaweb/aoconnect";
import fs from 'fs';

async function deploy() {
  const wallet = JSON.parse(
    fs.readFileSync("./wallet.json").toString(),
  );
  const module = "XnL5if1y61soZRpsVJsOJ3-_8MinPtrhgH6dSOCxfoY"
  const scheduler = "TZ7o7SIZ06ZEJ14lXwVtng1EtSx60QkPy-kh-kdAXog"

  const CU_URL = "https://ao-cu-router-1.onrender.com";
  const MU_URL = "https://ao-mu-router-1.onrender.com";
  const data = fs.readFileSync('./src/liteseed.lua', 'utf-8');

  console.log(await createDataItemSigner(wallet)({data: "data", tags: [{ name: "name", value: "value"}]}));

  const { spawn } = connect({
    CU_URL,
    MU_URL,
  });
  const processId = await spawn({
    module,
    scheduler,
    signer: createDataItemSigner(wallet),
    data,
  });
  console.log(processId);

}

deploy();
