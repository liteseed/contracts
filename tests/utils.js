/**
 * 
 * @param {string} data 
 * @param {{name: string, value: string}[]} tags 
 * @param {string} id 
 * @param {string} owner 
 * @returns 
 */

export function generateMessage(data, tags, id, owner) {
  return {
    Id: id,
    Module: "MODULE",
    Owner: owner,
    Tags: tags,
    Data: data,
    'Block-Height': '100',
  }
}

export function sortByKey(a, b) {
  if (a.name < b.name) return 1;
  if (a.name > b.name) return -1;
  return 0;
}
