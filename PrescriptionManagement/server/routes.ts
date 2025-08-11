import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertPrescriptionSchema, insertMedicationSchema, insertScheduleSchema, insertOrderSchema, insertOrderItemSchema } from "@shared/schema";
// Import OCR.space functions
import { analyzePrescriptionImage, extractTextFromImage, suggestDosageSchedule } from "./ocr-space";
// import { analyzePrescriptionImage, extractTextFromImage, suggestDosageSchedule } from "./deepseek";
import { addDays, format, parseISO } from "date-fns";

// Schema for manual prescription entry
const manualPrescriptionSchema = z.object({
  doctorName: z.string(),
  date: z.string(),
  pharmacy: z.string().optional(),
  notes: z.string().optional(),
  medications: z.array(z.object({
    name: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    instructions: z.string(),
    refills: z.number().default(0),
    medicationType: z.string().default("tablet")
  }))
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup API routes with /api prefix
  const apiPrefix = "/api";

  // User routes
  app
    .get(`${apiPrefix}/user`, async (req: Request, res: Response) => {
      // This would typically validate the user session
      // For demo purposes, return the sample user with id 1
      const user = await storage.getUser(1);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    });

  // Prescription routes
  app
    .get(`${apiPrefix}/prescriptions`, async (req: Request, res: Response) => {
      const userId = 1; // In production this would come from the authenticated user
      const prescriptions = await storage.getPrescriptionsByUserId(userId);
      
      // Get medication counts for each prescription
      const result = await Promise.all(prescriptions.map(async (prescription) => {
        const medications = await storage.getMedicationsByPrescriptionId(prescription.id);
        return {
          ...prescription,
          medicationCount: medications.length
        };
      }));
      
      res.json(result);
    })
    .get(`${apiPrefix}/prescriptions/:id`, async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const prescription = await storage.getPrescription(id);
      
      if (!prescription) {
        return res.status(404).json({ message: "Prescription not found" });
      }
      
      const medications = await storage.getMedicationsByPrescriptionId(id);
      
      res.json({
        ...prescription,
        medications
      });
    })
    .post(`${apiPrefix}/prescriptions`, async (req: Request, res: Response) => {
      try {
        const data = insertPrescriptionSchema.parse(req.body);
        const prescription = await storage.createPrescription(data);
        res.status(201).json(prescription);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create prescription" });
      }
    })
    .put(`${apiPrefix}/prescriptions/:id`, async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const prescription = await storage.getPrescription(id);
        
        if (!prescription) {
          return res.status(404).json({ message: "Prescription not found" });
        }
        
        const data = insertPrescriptionSchema.partial().parse(req.body);
        const updated = await storage.updatePrescription(id, data);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update prescription" });
      }
    });

  // Medication routes
  app
    .get(`${apiPrefix}/medications`, async (req: Request, res: Response) => {
      const userId = 1; // In production this would come from the authenticated user
      const medications = await storage.getMedicationsByUserId(userId);
      res.json(medications);
    })
    .get(`${apiPrefix}/medications/:id`, async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const medication = await storage.getMedication(id);
      
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const schedules = await storage.getSchedulesByMedicationId(id);
      
      res.json({
        ...medication,
        schedules
      });
    })
    .post(`${apiPrefix}/medications`, async (req: Request, res: Response) => {
      try {
        const data = insertMedicationSchema.parse(req.body);
        const medication = await storage.createMedication(data);
        res.status(201).json(medication);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create medication" });
      }
    })
    .put(`${apiPrefix}/medications/:id`, async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const medication = await storage.getMedication(id);
        
        if (!medication) {
          return res.status(404).json({ message: "Medication not found" });
        }
        
        const data = insertMedicationSchema.partial().parse(req.body);
        const updated = await storage.updateMedication(id, data);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to update medication" });
      }
    });

  // Schedule routes
  app
    .get(`${apiPrefix}/schedules`, async (req: Request, res: Response) => {
      const userId = 1; // In production this would come from the authenticated user
      const schedules = await storage.getSchedulesByUserId(userId);
      res.json(schedules);
    })
    .get(`${apiPrefix}/schedules/today`, async (req: Request, res: Response) => {
      const userId = 1; // In production this would come from the authenticated user
      const schedules = await storage.getTodaySchedules(userId);
      
      // Enrich with medication information
      const enrichedSchedules = await Promise.all(schedules.map(async (schedule) => {
        const medication = await storage.getMedication(schedule.medicationId);
        return {
          ...schedule,
          medication: medication || null
        };
      }));
      
      // Sort by time
      enrichedSchedules.sort((a, b) => {
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        
        if (timeA[0] !== timeB[0]) {
          return timeA[0] - timeB[0];
        }
        return timeA[1] - timeB[1];
      });
      
      res.json(enrichedSchedules);
    })
    .post(`${apiPrefix}/schedules`, async (req: Request, res: Response) => {
      try {
        const data = insertScheduleSchema.parse(req.body);
        const schedule = await storage.createSchedule(data);
        res.status(201).json(schedule);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create schedule" });
      }
    })
    .put(`${apiPrefix}/schedules/:id/take`, async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const schedule = await storage.getSchedule(id);
        
        if (!schedule) {
          return res.status(404).json({ message: "Schedule not found" });
        }
        
        const updated = await storage.updateSchedule(id, {
          taken: true,
          takenAt: new Date()
        });
        
        res.json(updated);
      } catch (error) {
        res.status(500).json({ message: "Failed to update schedule" });
      }
    });

  // Order routes
  app
    .get(`${apiPrefix}/orders`, async (req: Request, res: Response) => {
      const userId = 1; // In production this would come from the authenticated user
      const orders = await storage.getOrdersByUserId(userId);
      
      // Enrich with order items
      const enrichedOrders = await Promise.all(orders.map(async (order) => {
        const items = await storage.getOrderItemsByOrderId(order.id);
        return {
          ...order,
          items
        };
      }));
      
      res.json(enrichedOrders);
    })
    .get(`${apiPrefix}/orders/active`, async (req: Request, res: Response) => {
      const userId = 1; // In production this would come from the authenticated user
      const orders = await storage.getActiveOrdersByUserId(userId);
      
      // Enrich with order items
      const enrichedOrders = await Promise.all(orders.map(async (order) => {
        const items = await storage.getOrderItemsByOrderId(order.id);
        return {
          ...order,
          items
        };
      }));
      
      res.json(enrichedOrders);
    })
    .get(`${apiPrefix}/orders/:id`, async (req: Request, res: Response) => {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      const items = await storage.getOrderItemsByOrderId(id);
      
      // Get medication details for each item
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const medication = await storage.getMedication(item.medicationId);
        return {
          ...item,
          medication: medication || null
        };
      }));
      
      res.json({
        ...order,
        items: enrichedItems
      });
    })
    .post(`${apiPrefix}/orders`, async (req: Request, res: Response) => {
      try {
        // Format dates properly before validation
        const formattedData = {
          ...req.body,
          orderDate: req.body.orderDate ? new Date(req.body.orderDate).toISOString() : undefined,
          estimatedDelivery: req.body.estimatedDelivery ? new Date(req.body.estimatedDelivery).toISOString() : undefined,
          actualDelivery: req.body.actualDelivery ? new Date(req.body.actualDelivery).toISOString() : undefined
        };
        
        const data = insertOrderSchema.parse(formattedData);
        const order = await storage.createOrder(data);
        res.status(201).json(order);
      } catch (error) {
        console.error("Order creation error:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create order" });
      }
    })
    .post(`${apiPrefix}/order-items`, async (req: Request, res: Response) => {
      try {
        const data = insertOrderItemSchema.parse(req.body);
        const orderItem = await storage.createOrderItem(data);
        res.status(201).json(orderItem);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create order item" });
      }
    });

  // AI/OCR routes
  app
    // Manual prescription entry route that doesn't use OpenAI
    .post(`${apiPrefix}/manual-prescription`, async (req: Request, res: Response) => {
      try {
        const prescriptionData = manualPrescriptionSchema.parse(req.body);
        const userId = 1; // In production this would come from the authenticated user
        
        // Create a new prescription
        const prescription = await storage.createPrescription({
          userId,
          doctorName: prescriptionData.doctorName,
          date: prescriptionData.date,
          status: "processing",
          notes: prescriptionData.notes || "",
          metadata: prescriptionData
        });
        
        // Create medications from the prescription
        const medications = await Promise.all(prescriptionData.medications.map(async (med) => {
          return storage.createMedication({
            prescriptionId: prescription.id,
            userId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            instructions: med.instructions,
            refills: med.refills || 0,
            startDate: new Date().toISOString(),
            endDate: undefined,
            pharmacy: prescriptionData.pharmacy || "MedExpress Pharmacy",
            active: true,
            medicationType: med.medicationType || "tablet"
          });
        }));
        
        // Generate basic schedules for each medication based on frequency
        for (const medication of medications) {
          // Parse frequency to generate schedule times
          let suggestedTimes: string[] = [];
          
          if (medication.frequency.toLowerCase().includes("daily") || 
              medication.frequency.toLowerCase().includes("once a day")) {
            suggestedTimes = ["09:00"];
          } else if (medication.frequency.toLowerCase().includes("twice") || 
                     medication.frequency.toLowerCase().includes("two times") ||
                     medication.frequency.toLowerCase().includes("2 times")) {
            suggestedTimes = ["09:00", "21:00"];
          } else if (medication.frequency.toLowerCase().includes("three times") || 
                     medication.frequency.toLowerCase().includes("3 times")) {
            suggestedTimes = ["09:00", "15:00", "21:00"];
          } else if (medication.frequency.toLowerCase().includes("four times") || 
                     medication.frequency.toLowerCase().includes("4 times")) {
            suggestedTimes = ["08:00", "12:00", "16:00", "20:00"];
          } else {
            // Default to once daily if frequency format is not recognized
            suggestedTimes = ["09:00"];
          }
          
          // Create schedule entries for each suggested time
          for (const time of suggestedTimes) {
            await storage.createSchedule({
              medicationId: medication.id,
              userId,
              time,
              dayOfWeek: "daily",
              taken: false
            });
          }
        }
        
        res.json({
          prescription,
          medications,
          message: "Prescription processed successfully"
        });
      } catch (error: any) {
        console.error("Manual prescription entry error:", error);
        res.status(500).json({ 
          message: "Failed to process manual prescription entry", 
          error: error.message 
        });
      }
    })
    .post(`${apiPrefix}/scan-prescription`, async (req: Request, res: Response) => {
      try {
        const { image } = req.body;
        
        if (!image) {
          return res.status(400).json({ message: "Image data is required" });
        }
        
        // Remove data URI if present
        const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
        
        console.log('Processing prescription image, size:', Math.round(base64Data.length / 1024), 'KB');
        
        // Analyze prescription with OpenAI
        const prescriptionDetails = await analyzePrescriptionImage(base64Data);
        
        // Create a new prescription
        const userId = 1; // In production this would come from the authenticated user
        
        const prescription = await storage.createPrescription({
          userId,
          doctorName: prescriptionDetails.doctorName,
          date: prescriptionDetails.date ? prescriptionDetails.date : new Date().toISOString(),
          status: "processing",
          notes: prescriptionDetails.notes || "",
          metadata: prescriptionDetails
        });
        
        // Create medications from the prescription
        const medications = await Promise.all(prescriptionDetails.medications.map(async (med) => {
          return storage.createMedication({
            prescriptionId: prescription.id,
            userId,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            instructions: med.instructions,
            refills: med.refills || 0,
            startDate: new Date().toISOString(),
            endDate: med.endDate || undefined,
            pharmacy: prescriptionDetails.pharmacy || "MedExpress Pharmacy",
            active: true,
            medicationType: med.medicationType || "tablet"
          });
        }));
        
        // Generate schedules for each medication
        for (const medication of medications) {
          // Get suggested times from the AI
          const suggestedTimes = await suggestDosageSchedule({
            name: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            instructions: medication.instructions || "",
            refills: medication.refills || 0,
            medicationType: medication.medicationType || "tablet",
            startDate: medication.startDate,
            endDate: medication.endDate === null ? undefined : medication.endDate
          });
          
          // Create schedule entries for each suggested time
          for (const time of suggestedTimes) {
            await storage.createSchedule({
              medicationId: medication.id,
              userId,
              time,
              dayOfWeek: "daily",
              taken: false
            });
          }
        }
        
        res.json({
          prescription,
          medications,
          message: "Prescription processed successfully"
        });
      } catch (error: any) {
        console.error("Prescription scanning error:", error);
        res.status(500).json({ 
          message: "Failed to scan prescription", 
          error: error.message 
        });
      }
    })
    .post(`${apiPrefix}/extract-text`, async (req: Request, res: Response) => {
      try {
        const { image } = req.body;
        
        if (!image) {
          return res.status(400).json({ message: "Image data is required" });
        }
        
        // Remove data URI if present
        const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
        
        // Extract text from image
        const extractedText = await extractTextFromImage(base64Data);
        
        res.json({
          text: extractedText
        });
      } catch (error: any) {
        console.error("Text extraction error:", error);
        res.status(500).json({ 
          message: "Failed to extract text from image", 
          error: error.message 
        });
      }
    });

  const httpServer = createServer(app);
  return httpServer;
}
