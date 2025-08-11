import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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

export async function analyzePrescriptionImage(base64Image: string): Promise<PrescriptionDetails> {
  try {
    // Validate API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 10) {
      throw new Error("Invalid or missing OpenAI API key. Please check your environment variables.");
    }

    console.log("Requesting OpenAI analysis of prescription image...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a medical prescription analyzer. Extract all relevant information from the prescription image. 
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
          
          If you cannot read some information clearly, use your best guess but include a note about the uncertainty.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this prescription image and extract all medication information."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    console.log("Received OpenAI response successfully");
    const content = response.choices[0].message.content || "{}";
    
    try {
      const result = JSON.parse(content);
      
      // Validate the response has the expected structure
      if (!result.doctorName || !result.date || !Array.isArray(result.medications) || result.medications.length === 0) {
        console.warn("Incomplete prescription data extracted:", JSON.stringify(result));
        throw new Error("Failed to extract complete prescription information from image");
      }
      
      return result;
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid response format from AI analysis");
    }
  } catch (error: any) {
    // Check for specific OpenAI API errors
    if (error.status === 401) {
      console.error("OpenAI authentication error: Invalid API key");
      throw new Error("Authentication error with OpenAI service. Please check your API key.");
    } else if (error.status === 429) {
      console.error("OpenAI rate limit exceeded");
      throw new Error("Rate limit exceeded for AI service. Please try again later.");
    } else if (error.status === 500) {
      console.error("OpenAI server error");
      throw new Error("The AI service encountered an internal error. Please try again later.");
    }
    
    console.error("OpenAI API error:", error.message);
    throw new Error(`Failed to analyze prescription: ${error.message}`);
  }
}

export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    // Validate API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 10) {
      throw new Error("Invalid or missing OpenAI API key. Please check your environment variables.");
    }

    console.log("Requesting OpenAI text extraction from image...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this image, preserving formatting as much as possible."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });

    console.log("Text extraction completed successfully");
    return response.choices[0].message.content || "";
  } catch (error: any) {
    // Check for specific OpenAI API errors
    if (error.status === 401) {
      console.error("OpenAI authentication error: Invalid API key");
      throw new Error("Authentication error with OpenAI service. Please check your API key.");
    } else if (error.status === 429) {
      console.error("OpenAI rate limit exceeded");
      throw new Error("Rate limit exceeded for AI service. Please try again later.");
    } else if (error.status === 500) {
      console.error("OpenAI server error");
      throw new Error("The AI service encountered an internal error. Please try again later.");
    }
    
    console.error("OpenAI API error:", error.message);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

export async function suggestDosageSchedule(medication: MedicationDetails): Promise<string[]> {
  try {
    // Validate API key is set
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 10) {
      throw new Error("Invalid or missing OpenAI API key. Please check your environment variables.");
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
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content || "{}";
    
    try {
      const result = JSON.parse(content);
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
    // Check for specific OpenAI API errors
    if (error.status === 401) {
      console.error("OpenAI authentication error: Invalid API key");
      throw new Error("Authentication error with OpenAI service. Please check your API key.");
    } else if (error.status === 429) {
      console.error("OpenAI rate limit exceeded");
      throw new Error("Rate limit exceeded for AI service. Please try again later.");
    } else if (error.status === 500) {
      console.error("OpenAI server error");
      throw new Error("The AI service encountered an internal error. Please try again later.");
    }
    
    console.error("OpenAI API error:", error.message);
    throw new Error(`Failed to suggest dosage schedule: ${error.message}`);
  }
}
