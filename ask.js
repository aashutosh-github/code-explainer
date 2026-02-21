import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import { buildContext } from "./08_queryEngine.js";
import { generateAnswer } from "./09_llmResponder.js";

/* ===============================
   CLI
================================ */

const rl = readline.createInterface({ input, output });

let History = [];

async function ask() {
  try {
    console.log("💬 Ask a question about the codebase:");
    const query = await rl.question("> ");
    if (["exit", "quit"].includes(query.trim().toLowerCase())) {
      console.log("Exiting!");
      rl.close();
      process.exit(0);
    }

    console.log("\n Thinking...");

    const context = await buildContext(query);
    // context = {query:string,context:[{...}]}
    const result = await generateAnswer(context, History);

    History = result.updatedHistory;

    console.log("\n================ ANSWER ================\n");
    console.log(result.answer);
    console.log("\n=======================================");

    ask();
  } catch (err) {
    console.error("Query failed:", err);
    rl.close();
    process.exit(0);
  }
}

ask();
