import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export function buildPrompt(query, context) {
  if (!context || context.length === 0) {
    return `The user asked: "${query}", but no relevant code was found in the database.`;
  }

  let prompt = `You are provided with the following code snippets and their architectural relationships to answer the user's question: "${query}"\n\n`;

  context.forEach((entry, index) => {
    const { metadata, code, graphContext } = entry;
    prompt += `--- CODE SNIPPET ${index + 1} ---\n`;
    prompt += `LOCATION: ${metadata.file} (Symbol: ${metadata.symbol})\n`;
    prompt += `CONTENT:\n${code}\n`;

    if (graphContext && graphContext.length > 0) {
      prompt += `GRAPH RELATIONSHIPS:\n`;
      graphContext.forEach(rel => {
        prompt += `- This ${metadata.type} is connected to ${rel.name} (${rel.type})\n`;
      });
    }
    prompt += `\n`;
  });

  return prompt;
}
export async function generateAnswer(context, history = []) {
  try {
    // 1. Ensure the prompt is a clean string
    const userPrompt = buildPrompt(context.query, context.context);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `You are an expert software engineer.
        Only answer questions related to coding or software engineering.
        Answer using ONLY the provided code snippets and graph relationships.
        Be precise and answer step-by-step.
        Keep the answers sufficiently detailed.
        Only provide explanations and not the code or relationships itself.

        In the graph DB, the module refers to a file that is not defined inside another file.

        STRICT FORMATTING RULE:
        DO NOT use Markdown (no **, no ##, no *).
        Use plain numbers for lists (1. 2. 3.) and plain text for emphasis.`,
      },
      contents: [
        ...history,
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
    });

    const responseText = response.text;

    const updatedHistory = [
      ...history,
      { role: "user", parts: [{ text: userPrompt }] },
      { role: "model", parts: [{ text: responseText }] },
    ];

    return {
      answer: responseText,
      updatedHistory: updatedHistory,
    };
  } catch (error) {
    console.error("LLM Generation failed:", error.message);
    throw error;
  }
}
