import { ocrSpace } from 'ocr-space-api-wrapper';

// OCR.space API key
const OCR_API_KEY = process.env.OCR_API_KEY || 'K85092641488957'; // Default to the provided key

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
 * Analyzes a prescription image using OCR.space API
 * @param base64Image Base64-encoded image data
 * @returns Structured prescription details
 */
export async function analyzePrescriptionImage(base64Image: string): Promise<PrescriptionDetails> {
  try {
    // Validate API key is set
    if (!OCR_API_KEY) {
      throw new Error("Missing OCR.space API key. Please check your environment variables.");
    }

    console.log("Requesting OCR.space analysis of prescription image...");
    
    // Extract text from the image
    const extractedText = await extractTextFromImage(base64Image);
    console.log("Text extracted successfully, analyzing content...");
    
    // Simple parsing of prescription information
    // This is a basic implementation - in a real-world scenario, you might want to 
    // use a more sophisticated approach or integrate with an AI service for better parsing
    const prescription = parseExtractedText(extractedText);
    
    return prescription;
  } catch (error: any) {
    console.error("OCR.space API error:", error.message);
    throw new Error(`Failed to analyze prescription: ${error.message}`);
  }
}

/**
 * Extracts text from an image using OCR.space API
 * @param base64Image Base64-encoded image data
 * @returns Extracted text from the image
 */
export async function extractTextFromImage(base64Image: string): Promise<string> {
  try {
    // Validate API key is set
    if (!OCR_API_KEY) {
      throw new Error("Missing OCR.space API key. Please check your environment variables.");
    }

    console.log("Requesting OCR.space text extraction from image...");
    
    // Remove the data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    
    // Call OCR.space API
    const result = await ocrSpace(`data:image/png;base64,${base64Data}`, { 
      apiKey: OCR_API_KEY,
      language: 'eng',
      isCreateSearchablePdf: false,
      isSearchablePdfHideTextLayer: false,
      scale: true,
      isTable: false,
      OCREngine: "2"  // More accurate OCR engine
    });
    
    if (result.OCRExitCode !== 1) {
      throw new Error(`OCR processing failed with code ${result.OCRExitCode}: ${result.ErrorMessage || 'Unknown error'}`);
    }
    
    if (!result.ParsedResults || result.ParsedResults.length === 0) {
      throw new Error('No text detected in the image');
    }
    
    const extractedText = result.ParsedResults[0].ParsedText;
    console.log("Text extraction completed successfully");
    return extractedText;
  } catch (error: any) {
    console.error("OCR.space API error:", error.message);
    throw new Error(`Failed to extract text from image: ${error.message}`);
  }
}

/**
 * Parse extracted text to identify prescription details
 * @param text Extracted text from prescription image
 * @returns Structured prescription details
 */
function parseExtractedText(text: string): PrescriptionDetails {
  // Default prescription with placeholder values
  const prescription: PrescriptionDetails = {
    doctorName: "Unknown Doctor",
    date: new Date().toISOString().split('T')[0], // Today's date as fallback
    medications: [],
    notes: ""
  };
  
  // Split text into lines for analysis
  const lines = text.split("\n").filter(line => line.trim() !== "");
  
  // Try to extract doctor's name (usually at the top of prescription)
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line.includes("Dr.") || line.includes("Doctor") || line.match(/\bDr\b/)) {
      prescription.doctorName = line.trim();
      break;
    }
  }
  
  // Try to extract date
  const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/;
  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      prescription.date = dateMatch[0];
      break;
    }
  }
  
  // Identify medications
  let currentMedication: MedicationDetails | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for medication names (often start with Rx or have mg/ml indicators)
    if (line.includes("Rx:") || line.includes("MEDICATION:") || 
        line.match(/\d+\s*mg\b/) || line.match(/\d+\s*ml\b/) ||
        (line.length > 3 && !line.includes(":") && i > 3)) {
      
      // If we found a new medication, save the previous one
      if (currentMedication) {
        prescription.medications.push(currentMedication);
      }
      
      // Create a new medication entry
      currentMedication = {
        name: line.replace(/Rx:|MEDICATION:/g, "").trim(),
        dosage: "",
        frequency: "",
        instructions: "",
        refills: 0,
        medicationType: "tablet" // Default type
      };
      
      // Look ahead for dosage information
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.match(/\d+\s*mg\b/) || nextLine.match(/\d+\s*ml\b/)) {
          currentMedication.dosage = nextLine;
          i++; // Skip this line in the next iteration
        }
      }
      
      // Look ahead for frequency/instructions
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.includes("Take") || nextLine.includes("Use") || 
            nextLine.includes("daily") || nextLine.includes("times")) {
          currentMedication.frequency = nextLine;
          currentMedication.instructions = nextLine;
          i++; // Skip this line in the next iteration
        }
      }
      
      // Look for refills
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const refillMatch = nextLine.match(/Refill[s]?[:\s]+(\d+)/i);
        if (refillMatch) {
          currentMedication.refills = parseInt(refillMatch[1], 10) || 0;
          i++; // Skip this line in the next iteration
        }
      }
    }
    
    // Additional instructions for current medication
    else if (currentMedication && 
            (line.includes("Take") || line.includes("Use") || 
             line.includes("daily") || line.includes("times"))) {
      currentMedication.instructions += " " + line;
      currentMedication.frequency = line;
    }
    
    // Refill information
    else if (currentMedication && line.match(/Refill[s]?[:\s]+(\d+)/i)) {
      const refillMatch = line.match(/Refill[s]?[:\s]+(\d+)/i);
      if (refillMatch) {
        currentMedication.refills = parseInt(refillMatch[1], 10) || 0;
      }
    }
    
    // Pharmacy information
    else if (line.includes("Pharmacy") || line.includes("pharmacy")) {
      prescription.pharmacy = line.replace(/Pharmacy[:\s]*/i, "").trim();
    }
    
    // Notes/additional instructions
    else if (i > lines.length / 2 && line.length > 10) {
      prescription.notes = (prescription.notes || "") + line + " ";
    }
  }
  
  // Add the last medication if exists
  if (currentMedication) {
    prescription.medications.push(currentMedication);
  }
  
  // If no medications were found, add a placeholder one to avoid errors
  if (prescription.medications.length === 0) {
    prescription.medications.push({
      name: "Unknown Medication",
      dosage: "Unknown",
      frequency: "As directed",
      instructions: "Please consult your doctor",
      refills: 0,
      medicationType: "unknown"
    });
  }
  
  return prescription;
}

/**
 * Suggests a dosage schedule for a medication
 * @param medication Medication details
 * @returns Array of suggested dosage times in 24-hour format
 */
export async function suggestDosageSchedule(medication: MedicationDetails): Promise<string[]> {
  try {
    console.log(`Generating dosage schedule for ${medication.name}...`);
    
    // Parse the frequency to suggest appropriate times
    const frequency = medication.frequency.toLowerCase();
    const instructions = medication.instructions.toLowerCase();
    
    // Default morning/evening schedule
    let times = ["08:00", "20:00"];
    
    // Once daily
    if (frequency.includes("once") || frequency.includes("daily") || frequency.includes("every day")) {
      // Morning dose
      if (frequency.includes("morning") || instructions.includes("morning")) {
        times = ["08:00"];
      }
      // Evening/night dose
      else if (frequency.includes("evening") || frequency.includes("night") || 
               instructions.includes("evening") || instructions.includes("night") ||
               instructions.includes("bedtime") || instructions.includes("bed time")) {
        times = ["20:00"];
      }
      // Afternoon dose
      else if (frequency.includes("afternoon") || instructions.includes("afternoon")) {
        times = ["14:00"];
      }
      // Default to morning if not specified
      else {
        times = ["08:00"];
      }
    }
    // Twice daily
    else if (frequency.includes("twice") || frequency.includes("two times") || 
             frequency.includes("2 times") || frequency.includes("bid")) {
      times = ["08:00", "20:00"];
    }
    // Three times daily
    else if (frequency.includes("three times") || frequency.includes("3 times") || 
             frequency.includes("thrice") || frequency.includes("tid")) {
      times = ["08:00", "14:00", "20:00"];
    }
    // Four times daily
    else if (frequency.includes("four times") || frequency.includes("4 times") || 
             frequency.includes("qid")) {
      times = ["08:00", "12:00", "16:00", "20:00"];
    }
    // Every X hours
    else if (frequency.match(/every\s+(\d+)\s+hours?/)) {
      const match = frequency.match(/every\s+(\d+)\s+hours?/);
      if (match) {
        const hourInterval = parseInt(match[1], 10);
        if (hourInterval > 0) {
          times = [];
          let currentHour = 8; // Start at 8 AM
          
          // Generate times based on the interval
          while (times.length < 24 / hourInterval) {
            times.push(`${currentHour.toString().padStart(2, '0')}:00`);
            currentHour = (currentHour + hourInterval) % 24;
            if (currentHour === 8) break; // Full day covered
          }
        }
      }
    }
    
    console.log(`Suggested dosage times for ${medication.name}: ${times.join(', ')}`);
    return times;
  } catch (error: any) {
    console.error("Error generating dosage schedule:", error.message);
    // Return a default schedule if there's an error
    return ["08:00", "20:00"];
  }
}