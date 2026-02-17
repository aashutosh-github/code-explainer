import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import { buildContext } from "./08_queryEngine.js";
import { generateAnswer } from "./09_llmResponder.js";

/* ===============================
   CLI
================================ */

const rl = readline.createInterface({ input, output });

async function ask() {
  try {
    console.log("💬 Ask a question about the codebase:");
    const query = await rl.question("> ");
    if (
      query.trim().toLowerCase() === "exit" ||
      query.trim().toLowerCase() === "quit"
    ) {
      rl.close();
      return;
    }

    console.log("\n🤖 Thinking...");

    const context = await buildContext(query);
    const answer = await generateAnswer(context);

    console.log("\n================ ANSWER ================\n");
    console.log(answer);
    console.log("\n=======================================");

    rl.close();
  } catch (err) {
    console.error("❌ Query failed:", err);
    rl.close();
  }
}

ask();
