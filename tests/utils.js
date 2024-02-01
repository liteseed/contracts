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