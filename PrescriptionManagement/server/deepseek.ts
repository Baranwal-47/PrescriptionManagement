import { ChatDeepSeek } from "@langchain/deepseek";

// Initialize DeepSeek client
const deepseek = new ChatDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  temperature: 0.1, // Lower temperature for more deterministic outputs
  model: "deepseek-chat", // Using DeepSeek's chat model
});

// Helper functions to handle LangChain response formats
function extractResponseContent(response: any): string {
  if (typeof response.content === 'string') {
    return response.content;
  } else if (Array.isArray(response.content)) {
    // For structured content, join all text parts together
    return response.content
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text)
      .join('\n');
  }
  // Fallback if structure is unexpected
  return JSON.stringify(response);
}

// Helper function to extract JSON from AI response text
function extractJsonFromText(text: string): string {
  // Look for JSON in code blocks
  const jsonCodeBlockMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
    return jsonCodeBlockMatch[1].trim();
  }
  
  // Look for JSON objects
  const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonObjectMatch && jsonObjectMatch[1]) {
    return jsonObjectMatch[1].trim();
  }
  
  // No valid JSON format found, return the original text
  return text;
}

interface MedicationDetails {
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  refills: number;
  medicationType: string;
  startDate?: string;
  endDate?: string;
}

interface PrescriptionDetails {
  doctorName: string;
  date: string;
  pharmacy?: string;
  medications: MedicationDetails[];
  notes?: string;
}

/**
 * Analyzes a prescription image using DeepSeek AI
 * @param base64Image Base64-encoded image data
 * @returns Structured prescription details
 */
export async function analyzePrescriptionImage(base64Image: string): Promise<PrescriptionDetails> {
  try {
    // Validate API key is set
    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.length < 10) {
      throw new Error("Invalid or missing DeepSeek API key. Please check your environment variables.");
    }

    console.log("Requesting DeepSeek analysis of prescription image...");
    
    const systemPrompt = `You are a medical prescription analyzer. Extract all relevant information from the prescription image. 
      Parse the prescription and return the data in a structured JSON format including:
      - Doctor's name
      - Prescription date
      - Pharmacy (if mentioned)
      - List of medications, each with: name, dosage, frequency, instructions, refills, medicationType (tablet/capsule/liquid)
      - Any additional notes
      
      Use the exact JSON format:
      {
        "doctorName": "string",
        "date": "YYYY-MM-DD",
        "pharmacy": "string" (optional),
        "medications": [
          {
            "name": "string",
            "dosage": "string",
            "frequency": "string",
            "instructions": "string",
            "refills": number,
            "medicationType": "string"
          }
        ],
        "notes": "string" (optional)
      }
      
      If you cannot read some information clearly, use your best guess but include a note about the uncertainty.`;

    const userPrompt = `Please analyze this prescription image and extract all medication information. The image is provided as a base64 encoded string in the format: data:image/jpeg;base64,${base64Image.slice(0, 20)}...`;

    const response = await deepseek.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    console.log("Received DeepSeek response successfully");
    const content = extractResponseContent(response);
    
    try {
      // Extract and parse JSON from the response text
      const jsonString = extractJsonFromText(content);
      const result = JSON.parse(jsonString);
      
      // Validate the response has the expected structure
      if (!result.doctorName || !result.date || !Array.isArray(result.medications) || result.medications.length === 0) {
        console.warn("Incomplete prescription data extracted:", JSON.stringify(result));
        throw new Error("Failed to extract complete prescription information from image");
      }
      
      return result;
    } catch (parseError) {
      console.error("Failed to parse DeepSeek response:", content);
      throw new Error("Invalid response format from AI analysis");
    }
  } catch (error: any) {
    console.error("DeepSeek API error:", error.message);
    throw new Error(`Failed to analyze prescription: ${error.message}`);
  }
}

/**
 * Extracts text from an image using DeepSeek AI
 * @param base64Image Base64-encoded image data
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    // Validate API key is set
    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.length < 10) {
      throw new Error("Invalid or missing DeepSeek API key. Please check your environment variables.");
    }

    console.log("Requesting DeepSeek text extraction from image...");
    
    const prompt = `Extract all text from this image, preserving formatting as much as possible. The image is provided as a base64 encoded string in the format: data:image/jpeg;base64,${base64Image.slice(0, 20)}...`;

    const response = await deepseek.invoke(prompt);

    console.log("Text extraction completed successfully");
    return extractResponseContent(response);
  } catch (error: any) {
    console.error("DeepSeek API error:", error.message);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

/**
 * Suggests a dosage schedule for a medication using DeepSeek AI
 * @param medication Medication details
 * @returns Array of suggested dosage times in 24-hour format
 */
export async function suggestDosageSchedule(medication: MedicationDetails): Promise<string[]> {
  try {
    // Validate API key is set
    if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.length < 10) {
      throw new Error("Invalid or missing DeepSeek API key. Please check your environment variables.");
    }

    console.log(`Generating dosage schedule for ${medication.name}...`);
    
    const prompt = `
      Based on the following medication information, suggest specific times of day for taking this medication:
      
      Name: ${medication.name}
      Dosage: ${medication.dosage}
      Frequency: ${medication.frequency}
      Instructions: ${medication.instructions || "None provided"}
      Type: ${medication.medicationType}
      
      Return the result as a JSON object with a "times" array of time strings in 24-hour format (e.g., {"times": ["07:00", "19:00"]}).
      Consider common medication timing practices and the instructions provided.
    `;
    
    const response = await deepseek.invoke(prompt);
    const content = extractResponseContent(response);
    
    try {
      // Extract and parse JSON from the response text
      const jsonString = extractJsonFromText(content);
      const result = JSON.parse(jsonString);
      
      if (!result.times || !Array.isArray(result.times)) {
        console.warn("Invalid dosage schedule format:", content);
        // Fallback to default times if the AI doesn't provide valid schedule
        return ["08:00", "20:00"];
      }
      return result.times;
    } catch (parseError) {
      console.error("Failed to parse dosage schedule:", content);
      // Fallback to default times
      return ["08:00", "20:00"];
    }
  } catch (error: any) {
    console.error("DeepSeek API error:", error.message);
    throw new Error(`Failed to suggest dosage schedule: ${error.message}`);
  }
}