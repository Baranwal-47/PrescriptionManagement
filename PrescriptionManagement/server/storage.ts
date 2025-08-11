import {
  User, InsertUser, Prescription, InsertPrescription, 
  Medication, InsertMedication, Schedule, InsertSchedule,
  Order, InsertOrder, OrderItem, InsertOrderItem
} from "@shared/schema";
import { addDays, format } from "date-fns";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Prescription operations
  getPrescription(id: number): Promise<Prescription | undefined>;
  getPrescriptionsByUserId(userId: number): Promise<Prescription[]>;
  createPrescription(prescription: InsertPrescription): Promise<Prescription>;
  updatePrescription(id: number, prescription: Partial<Prescription>): Promise<Prescription | undefined>;

  // Medication operations
  getMedication(id: number): Promise<Medication | undefined>;
  getMedicationsByUserId(userId: number): Promise<Medication[]>;
  getMedicationsByPrescriptionId(prescriptionId: number): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: number, medication: Partial<Medication>): Promise<Medication | undefined>;

  // Schedule operations
  getSchedule(id: number): Promise<Schedule | undefined>;
  getSchedulesByUserId(userId: number): Promise<Schedule[]>;
  getSchedulesByMedicationId(medicationId: number): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<Schedule>): Promise<Schedule | undefined>;
  getTodaySchedules(userId: number): Promise<Schedule[]>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, order: Partial<Order>): Promise<Order | undefined>;
  getActiveOrdersByUserId(userId: number): Promise<Order[]>;

  // Order item operations
  getOrderItem(id: number): Promise<OrderItem | undefined>;
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prescriptions: Map<number, Prescription>;
  private medications: Map<number, Medication>;
  private schedules: Map<number, Schedule>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  
  private userId: number;
  private prescriptionId: number;
  private medicationId: number;
  private scheduleId: number;
  private orderId: number;
  private orderItemId: number;

  constructor() {
    this.users = new Map();
    this.prescriptions = new Map();
    this.medications = new Map();
    this.schedules = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    
    this.userId = 1;
    this.prescriptionId = 1;
    this.medicationId = 1;
    this.scheduleId = 1;
    this.orderId = 1;
    this.orderItemId = 1;
    
    // Add sample data for development
    this.initSampleData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...userData, id };
    this.users.set(id, user);
    return user;
  }

  // Prescription methods
  async getPrescription(id: number): Promise<Prescription | undefined> {
    return this.prescriptions.get(id);
  }

  async getPrescriptionsByUserId(userId: number): Promise<Prescription[]> {
    return Array.from(this.prescriptions.values()).filter(
      (prescription) => prescription.userId === userId
    );
  }

  async createPrescription(prescriptionData: InsertPrescription): Promise<Prescription> {
    const id = this.prescriptionId++;
    const prescription: Prescription = { ...prescriptionData, id };
    this.prescriptions.set(id, prescription);
    return prescription;
  }

  async updatePrescription(id: number, prescriptionData: Partial<Prescription>): Promise<Prescription | undefined> {
    const prescription = this.prescriptions.get(id);
    if (!prescription) return undefined;
    
    const updatedPrescription = { ...prescription, ...prescriptionData };
    this.prescriptions.set(id, updatedPrescription);
    return updatedPrescription;
  }

  // Medication methods
  async getMedication(id: number): Promise<Medication | undefined> {
    return this.medications.get(id);
  }

  async getMedicationsByUserId(userId: number): Promise<Medication[]> {
    return Array.from(this.medications.values()).filter(
      (medication) => medication.userId === userId
    );
  }

  async getMedicationsByPrescriptionId(prescriptionId: number): Promise<Medication[]> {
    return Array.from(this.medications.values()).filter(
      (medication) => medication.prescriptionId === prescriptionId
    );
  }

  async createMedication(medicationData: InsertMedication): Promise<Medication> {
    const id = this.medicationId++;
    const medication: Medication = { ...medicationData, id };
    this.medications.set(id, medication);
    return medication;
  }

  async updateMedication(id: number, medicationData: Partial<Medication>): Promise<Medication | undefined> {
    const medication = this.medications.get(id);
    if (!medication) return undefined;
    
    const updatedMedication = { ...medication, ...medicationData };
    this.medications.set(id, updatedMedication);
    return updatedMedication;
  }

  // Schedule methods
  async getSchedule(id: number): Promise<Schedule | undefined> {
    return this.schedules.get(id);
  }

  async getSchedulesByUserId(userId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.userId === userId
    );
  }

  async getSchedulesByMedicationId(medicationId: number): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(
      (schedule) => schedule.medicationId === medicationId
    );
  }

  async createSchedule(scheduleData: InsertSchedule): Promise<Schedule> {
    const id = this.scheduleId++;
    const schedule: Schedule = { ...scheduleData, id };
    this.schedules.set(id, schedule);
    return schedule;
  }

  async updateSchedule(id: number, scheduleData: Partial<Schedule>): Promise<Schedule | undefined> {
    const schedule = this.schedules.get(id);
    if (!schedule) return undefined;
    
    const updatedSchedule = { ...schedule, ...scheduleData };
    this.schedules.set(id, updatedSchedule);
    return updatedSchedule;
  }

  async getTodaySchedules(userId: number): Promise<Schedule[]> {
    const today = new Date();
    const dayOfWeek = format(today, 'EEEE').toLowerCase();
    
    return Array.from(this.schedules.values()).filter(schedule => {
      // If user doesn't match, skip
      if (schedule.userId !== userId) return false;
      
      // Check if schedule applies to today
      const days = schedule.dayOfWeek?.toLowerCase().split(',') || [];
      return days.includes('daily') || days.includes(dayOfWeek);
    });
  }

  // Order methods
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId
    );
  }

  async createOrder(orderData: InsertOrder): Promise<Order> {
    const id = this.orderId++;
    const order: Order = { ...orderData, id };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: number, orderData: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, ...orderData };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getActiveOrdersByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId && 
        ['ordered', 'shipped', 'in_transit'].includes(order.status)
    );
  }

  // Order item methods
  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    return this.orderItems.get(id);
  }

  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (orderItem) => orderItem.orderId === orderId
    );
  }

  async createOrderItem(orderItemData: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemId++;
    const orderItem: OrderItem = { ...orderItemData, id };
    this.orderItems.set(id, orderItem);
    return orderItem;
  }

  // Initialize sample data for development
  private initSampleData() {
    // Create sample user
    const user: User = {
      id: this.userId++,
      username: 'johndoe',
      password: 'password',
      fullName: 'John Doe',
      email: 'john.doe@example.com'
    };
    this.users.set(user.id, user);

    // Create sample prescriptions
    const prescription1: Prescription = {
      id: this.prescriptionId++,
      userId: user.id,
      doctorName: 'Dr. Sarah Johnson',
      date: new Date('2023-05-15'),
      status: 'verified',
      notes: 'Take as directed',
      metadata: {}
    };
    this.prescriptions.set(prescription1.id, prescription1);

    const prescription2: Prescription = {
      id: this.prescriptionId++,
      userId: user.id,
      doctorName: 'Dr. Michael Chen',
      date: new Date('2023-05-20'),
      status: 'processing',
      notes: 'Finish entire course',
      metadata: {}
    };
    this.prescriptions.set(prescription2.id, prescription2);

    // Create sample medications
    const medication1: Medication = {
      id: this.medicationId++,
      prescriptionId: prescription1.id,
      userId: user.id,
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'once daily',
      instructions: 'Take with breakfast',
      refills: 3,
      startDate: new Date('2023-05-15'),
      active: true,
      medicationType: 'tablet',
      pharmacy: 'MedExpress Pharmacy'
    };
    this.medications.set(medication1.id, medication1);

    const medication2: Medication = {
      id: this.medicationId++,
      prescriptionId: prescription1.id,
      userId: user.id,
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'twice daily',
      instructions: 'Take with food',
      refills: 3,
      startDate: new Date('2023-05-15'),
      active: true,
      medicationType: 'tablet',
      pharmacy: 'MedExpress Pharmacy'
    };
    this.medications.set(medication2.id, medication2);

    const medication3: Medication = {
      id: this.medicationId++,
      prescriptionId: prescription1.id,
      userId: user.id,
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'once daily',
      instructions: 'Take before bed',
      refills: 3,
      startDate: new Date('2023-05-15'),
      active: true,
      medicationType: 'tablet',
      pharmacy: 'MedExpress Pharmacy'
    };
    this.medications.set(medication3.id, medication3);

    const medication4: Medication = {
      id: this.medicationId++,
      prescriptionId: prescription2.id,
      userId: user.id,
      name: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'three times daily',
      instructions: 'Take with water',
      refills: 0,
      startDate: new Date('2023-05-20'),
      endDate: new Date('2023-05-30'),
      active: true,
      medicationType: 'capsule',
      pharmacy: 'MedExpress Pharmacy'
    };
    this.medications.set(medication4.id, medication4);

    // Create sample schedules
    const schedule1: Schedule = {
      id: this.scheduleId++,
      medicationId: medication1.id,
      userId: user.id,
      time: '07:00',
      dayOfWeek: 'daily',
      taken: true,
      takenAt: new Date('2023-05-22T07:10:00')
    };
    this.schedules.set(schedule1.id, schedule1);

    const schedule2: Schedule = {
      id: this.scheduleId++,
      medicationId: medication2.id,
      userId: user.id,
      time: '14:00',
      dayOfWeek: 'daily',
      taken: false
    };
    this.schedules.set(schedule2.id, schedule2);

    const schedule3: Schedule = {
      id: this.scheduleId++,
      medicationId: medication3.id,
      userId: user.id,
      time: '20:00',
      dayOfWeek: 'daily',
      taken: false
    };
    this.schedules.set(schedule3.id, schedule3);

    // Create sample orders
    const order1: Order = {
      id: this.orderId++,
      userId: user.id,
      orderDate: new Date('2023-05-18'),
      status: 'in_transit',
      trackingNumber: 'TRK12345',
      estimatedDelivery: new Date('2023-05-24'),
      pharmacy: 'MedExpress Pharmacy',
      totalItems: 2
    };
    this.orders.set(order1.id, order1);

    const order2: Order = {
      id: this.orderId++,
      userId: user.id,
      orderDate: new Date('2023-05-12'),
      status: 'delivered',
      trackingNumber: 'TRK54321',
      estimatedDelivery: new Date('2023-05-18'),
      actualDelivery: new Date('2023-05-19'),
      pharmacy: 'MedExpress Pharmacy',
      totalItems: 1
    };
    this.orders.set(order2.id, order2);

    // Create sample order items
    const orderItem1: OrderItem = {
      id: this.orderItemId++,
      orderId: order1.id,
      medicationId: medication1.id,
      quantity: 30,
      price: 1199 // $11.99
    };
    this.orderItems.set(orderItem1.id, orderItem1);

    const orderItem2: OrderItem = {
      id: this.orderItemId++,
      orderId: order1.id,
      medicationId: medication2.id,
      quantity: 60,
      price: 1499 // $14.99
    };
    this.orderItems.set(orderItem2.id, orderItem2);

    const orderItem3: OrderItem = {
      id: this.orderItemId++,
      orderId: order2.id,
      medicationId: medication3.id,
      quantity: 30,
      price: 2499 // $24.99
    };
    this.orderItems.set(orderItem3.id, orderItem3);
  }
}

export const storage = new MemStorage();
