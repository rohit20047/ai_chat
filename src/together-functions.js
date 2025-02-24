import { ChatTogetherAI } from "@langchain/community/chat_models/togetherai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define your function schema using Zod
const getWeatherSchema = z.object({
  location: z.string().describe("The city or location to get weather for"),
  unit: z.enum(["celsius", "fahrenheit"]).describe("Temperature unit")
});

// Initialize the model with JSON mode
const model = new ChatTogetherAI({
  model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
  temperature: 0,
  response_format: {
    type: "json_object",
    schema: zodToJsonSchema(getWeatherSchema)
  }
});

// Example function to demonstrate JSON mode
async function getWeatherInfo(userInput) {
  const messages = [
    {
      role: "system",
      content: "You are a helpful weather assistant. Extract location and temperature unit preference from the user's query and return them in JSON format."
    },
    {
      role: "user",
      content: userInput
    }
  ];

  try {
    const response = await model.invoke(messages);
    // Together.ai returns the response as a string, so we need to parse it
    const jsonResponse = JSON.parse(response.content);
    return jsonResponse;
  } catch (error) {
    console.error("Error calling Together.ai:", error);
    throw error;
  }
}

// Example usage
async function main() {
  try {
    const result = await getWeatherInfo("What's the weather like in New York? Give it in celsius please.");
    console.log("Parsed response:", result);
  } catch (error) {
    console.error("Error in main:", error);
  }
}

main();
