import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Build prompt for LLM
 */

function buildPrompt(chunks, relations) {
  let prompt = `
 RELEVANT CODE SNIPPETS:
 `;

  for (const chunk of chunks) {
    prompt += `
 ---------------------
 File: ${chunk.file}
 Symbol: ${chunk.symbol}
 ---------------------
 ${chunk.text}
 `;
  }

  if (relations.length > 0) {
    prompt += `
 RELATIONSHIPS BETWEEN COMPONENTS:
 `;
    for (const relation of relations) {
      prompt += `
   ${relation.from} ${relation.type} ${relation.to}
   `;
    }
  }
  return prompt;
}

/**
 * Generate final answer using Gemini
 */
export async function generateAnswer(context, history = []) {
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: `You are an expert software engineer. You will only answer questions related to coding or software engineering. You will gently but firmly decline all other requests unrelated to coding.
    Answer the user's question using ONLY the provided code snippets and relationships.
    Be precise and answer step-by-step.
    If the answer is not present in the given context, say you cannot determine as the asked part is not in the provided context.
    Return all the answer in raw text format, DO NOT include any kind of formatting
    Example:
      1. do not return **Heading-1**, return Heading-1
      2. do not return * bullet point 1, return bullet point 1`,
  });

  const prompt = buildPrompt(context.chunks, context.relations);
  const chat = model.startChat({
    history: history,
  });

  const messageWithContext = `
  ${prompt}

  User Question: ${context.query}
  `;
  const result = await chat.sendMessage(messageWithContext);
  const responseText = result.response.text();

  return {
    answer: responseText,
    updatedHistory: await chat.getHistory(),
  };
}
