export function evaluate(data) {
  return {
    Target: "DUMMY-PROCESS-ID",
    From: "SOME-PROCESS-ID",
    Tags: [
      { name: "Action", value: "Eval" }
    ],
    Data: data
  }
}

export function sortByKey(a, b) {
  if (a.name < b.name) return 1;
  else if (a.name > b.name) return -1;
  else return 0;
}
