import { GoogleGenerativeAI } from "@google/generative-ai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Build prompt for LLM
 */

function buildPrompt(query, chunks, relations) {
  let prompt = `
 You are an expert software engineer. You will only answer questions related to coding or software engineering. You will gently but firmly decline all other requests unrelated to coding.
 Answer the user's question using ONLY the provided code snippets and relationships.
 Be precise and answer step-by-step.

 User Question:
 ${query}

 =====================
 RELEVANT CODE SNIPPETS
 =====================
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
 =====================
 RELATIONSHIPS BETWEEN COMPONENTS
 =====================
 `;

    for (const relation of relations) {
      prompt += `
 ${relation.from} ${relation.type} ${relation.to}
 `;
    }
  }

  prompt += `
 =====================
 INSTRUCTIONS
 =====================
 Use the code and relationships above to answer.
 If something is not present, say you do not know.
 Explain clearly and concisely.
 `;

  return prompt;
}

/**
 * Generate final answer using Gemini
 */
export async function generateAnswer(context) {
  const model = genai.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = buildPrompt(context.query, context.chunks, context.relations);

  const result = await model.generateContent(prompt);
  return result.response.text();
}
