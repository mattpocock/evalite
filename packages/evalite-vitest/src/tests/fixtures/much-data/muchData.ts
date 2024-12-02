import { setTimeout } from "timers/promises";

export async function basics(input: string) {
  // To test whether duration is calculated properly
  await setTimeout(10);
  return input + "def";
}
