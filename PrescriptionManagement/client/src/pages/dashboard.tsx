import { useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import PrescriptionCard from "@/components/prescription/prescription-card";
import MedicationListItem from "@/components/medication/medication-list-item";
import OrderTracker from "@/components/orders/order-tracker";
import ScanModal from "@/components/prescription/scan-modal";
import MedicationDetailModal from "@/components/medication/medication-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Prescription {
  id: number;
  doctorName: string;
  date: string;
  status: string;
  medicationCount: number;
}

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  refills: number;
  startDate: string;
  endDate?: string;
  active: boolean;
  medicationType: string;
  pharmacy?: string;
}

interface Schedule {
  id: number;
  time: string;
  taken: boolean;
  medication: Medication;
}

interface Order {
  id: number;
  status: string;
  orderDate: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  totalItems: number;
}

export default function Dashboard() {
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayFormatted = format(new Date(), "MMMM d, yyyy");
  
  // Fetch prescriptions
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useQuery<Prescription[]>({
    queryKey: ["/api/prescriptions"],
  });

  // Fetch today's medication schedule
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules/today"],
  });

  // Fetch active orders
  const { data: orders, isLoading: isLoadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders/active"],
  });

  // Filter functions
  const [medicationFilter, setMedicationFilter] = useState("all");

  const filteredSchedules = schedules?.filter(schedule => {
    if (medicationFilter === "all") return true;
    if (medicationFilter === "active" && !schedule.taken) return true;
    if (medicationFilter === "completed" && schedule.taken) return true;
    return false;
  });

  return (
    <main className="flex-1 pb-8 bg-pattern-dots">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold gradient-text">Health Dashboard</h1>
          <p className="mt-1 text-sm text-blue-500 font-medium">Your medication overview and upcoming doses</p>
        </div>

        {/* Recent Prescriptions Section */}
        <div className="bg-white shadow rounded-lg mb-6 gradient-border card-hover">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-sans font-medium gradient-text">Recent Prescriptions</h2>
              <p className="text-sm font-medium text-blue-600">Newly added or modified prescriptions</p>
            </div>
            <div>
              <Link href="/medications">
                <button className="text-primary hover:text-primary/90 text-sm flex items-center">
                  View all
                  <span className="material-icons text-sm ml-1">arrow_forward</span>
                </button>
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {isLoadingPrescriptions ? (
                // Loading skeleton
                Array(3).fill(0).map((_, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-neutral-light flex justify-between">
                      <div>
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="border-t border-gray-200 px-4 py-4">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-12" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {prescriptions?.slice(0, 2).map((prescription) => (
                    <PrescriptionCard key={prescription.id} prescription={prescription} />
                  ))}

                  {/* Scan New Prescription Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-white border border-dashed border-blue-300 rounded-lg shadow-sm overflow-hidden flex flex-col items-center justify-center px-4 py-6 card-hover">
                    <div className="h-14 w-14 text-white rounded-full bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-center mb-4 shadow-lg">
                      <span className="material-icons text-2xl">add_a_photo</span>
                    </div>
                    <h3 className="text-xl font-bold gradient-text mb-1">Scan New Prescription</h3>
                    <p className="text-sm text-blue-600 text-center mb-4">Upload a photo or scan a prescription</p>
                    <button 
                      className="bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 px-6 border border-transparent rounded-md shadow-lg text-sm font-medium hover:shadow-xl transition-shadow duration-300 focus:outline-none"
                      onClick={() => setIsScanModalOpen(true)}
                    >
                      Scan Prescription
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Medication Timeline and Upcoming Doses */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Today's Medication */}
          <div className="bg-white shadow rounded-lg overflow-hidden lg:col-span-2 gradient-border card-hover">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-sans font-medium gradient-text">Today's Medication</h2>
                <p className="text-sm font-medium text-blue-600">{todayFormatted}</p>
              </div>
              <div>
                <Select
                  value={medicationFilter}
                  onValueChange={setMedicationFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All medications" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All medications</SelectItem>
                    <SelectItem value="active">Active only</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-t border-gray-200">
              {isLoadingSchedules ? (
                // Loading skeleton
                <ul className="divide-y divide-gray-200">
                  {Array(3).fill(0).map((_, index) => (
                    <li key={index} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="ml-4">
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                filteredSchedules && filteredSchedules.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {filteredSchedules.map((schedule) => (
                      <MedicationListItem 
                        key={schedule.id} 
                        schedule={schedule} 
                        onViewDetails={() => setSelectedMedication(schedule.medication)}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-blue-50">
                      <span className="material-icons text-blue-500 text-2xl">medication</span>
                    </div>
                    <p className="text-blue-500 font-medium">No medications scheduled for today</p>
                    <p className="text-gray-500 text-sm mt-1">You're all caught up!</p>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Active Orders */}
          <div className="bg-white shadow rounded-lg overflow-hidden gradient-border card-hover">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-sans font-medium gradient-text">Active Orders</h2>
              <p className="text-sm font-medium text-blue-600">Tracking your medication deliveries</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              {isLoadingOrders ? (
                // Loading skeleton
                Array(2).fill(0).map((_, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-2 w-full mt-3 mb-1 rounded" />
                    <div className="flex justify-between mt-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="mt-3">
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {orders && orders.length > 0 ? (
                    orders.map(order => (
                      <OrderTracker key={order.id} order={order} />
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-blue-50">
                        <span className="material-icons text-blue-500 text-2xl">local_shipping</span>
                      </div>
                      <p className="text-blue-500 font-medium">No active orders</p>
                      <p className="text-gray-500 text-sm mt-1">Need to restock? Order some medications!</p>
                    </div>
                  )}
                  
                  <Link href="/orders">
                    <button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-blue-400 text-white py-2 px-4 border-0 rounded-md shadow-lg text-sm font-medium hover:shadow-xl transition-all duration-300 focus:outline-none">
                      View All Orders
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scan Prescription Modal */}
      <ScanModal 
        isOpen={isScanModalOpen} 
        onClose={() => setIsScanModalOpen(false)} 
      />

      {/* Medication Detail Modal */}
      {selectedMedication && (
        <MedicationDetailModal
          medication={selectedMedication}
          isOpen={!!selectedMedication}
          onClose={() => setSelectedMedication(null)}
        />
      )}
    </main>
  );
}
