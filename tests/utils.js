/**
 * @param {{ data: string; from: string; target: string; tags: {name: string, value: string}[]}} args
 * @returns
 */

export function generateMessage({ target, from, data, tags }) {
  return {
    Target: target,
    Owner: "",
    From: from,
    Module: "ao.TN.x",
    Id: "MESSAGE_ID",
    Tags: tags ?? [],
    Data: data ?? "_",
    "Block-Height": "100",
  };
}

/**
 *
 * @param {{data: string; env: {Process: {Id: string; Owner: string;}}}} args 
 * @returns
 */

export function spawn({ data, env }) {
  return {
    Id: env.Process.Id,
    Owner: env.Process.Owner,
    Module: "ao.TN.x",
    Tags: [{ name: "Action", value: "Eval" }],
    Data: data,
    "Block-Height": "100",
  };
}

export function sortByKey(a, b) {
  if (a.name < b.name) return 1;
  if (a.name > b.name) return -1;
  return 0;
}
