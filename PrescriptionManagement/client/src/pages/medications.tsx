import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import MedicationDetailModal from "@/components/medication/medication-detail-modal";
import BatchOrderButton from "@/components/pharmacy/batch-order-button";
import OrderMedicationButton from "@/components/pharmacy/order-medication-button";
import { Search, CheckSquare, Pill } from "lucide-react";

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
  pharmacy: string;
}

export default function Medications() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [selectedMedications, setSelectedMedications] = useState<number[]>([]);
  
  const { data: medications, isLoading } = useQuery<Medication[]>({
    queryKey: ["/api/medications"],
  });
  
  // Toggle medication selection for batch order
  const toggleMedicationSelection = (id: number) => {
    setSelectedMedications((prev) => {
      if (prev.includes(id)) {
        return prev.filter((medicationId) => medicationId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Filter medications based on search and active status
  const filterMedications = (meds: Medication[] | undefined, activeOnly: boolean) => {
    if (!meds) return [];
    
    return meds.filter(med => {
      // Active filter
      if (activeOnly && !med.active) return false;
      
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          med.name.toLowerCase().includes(term) ||
          med.dosage.toLowerCase().includes(term) ||
          med.frequency.toLowerCase().includes(term) ||
          med.instructions.toLowerCase().includes(term) ||
          med.medicationType.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  };
  
  const activeMedications = filterMedications(medications, true);
  const allMedications = filterMedications(medications, false);
  const inactiveMedications = allMedications.filter(med => !med.active);

  return (
    <div className="min-h-screen py-8" style={{
      backgroundImage: "radial-gradient(#e2e8f0 1px, transparent 1px)",
      backgroundSize: "20px 20px"
    }}>
      <div className="container mx-auto px-4 py-8 max-w-5xl bg-white rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold gradient-text">My Medications</h1>
            <p className="text-gray-500">Manage and track all your medications</p>
          </div>
          {activeMedications && activeMedications.length > 0 && (
            <div className="mt-4 sm:mt-0">
              <BatchOrderButton 
                medications={activeMedications.filter(med => selectedMedications.includes(med.id))}
                buttonText="Order Selected"
                disabled={selectedMedications.length === 0}
                className="ml-2"
              />
            </div>
          )}
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search medications..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active">
              Active ({activeMedications.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({allMedications.length})
            </TabsTrigger>
            <TabsTrigger value="inactive">
              Inactive ({inactiveMedications.length})
            </TabsTrigger>
          </TabsList>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-6 w-32 mb-1" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <TabsContent value="active" className="mt-0">
                <MedicationGrid 
                  medications={activeMedications} 
                  onSelect={setSelectedMedication} 
                  emptyMessage="No active medications found"
                  selectedMedications={selectedMedications}
                  toggleSelection={toggleMedicationSelection}
                />
              </TabsContent>
              
              <TabsContent value="all" className="mt-0">
                <MedicationGrid 
                  medications={allMedications} 
                  onSelect={setSelectedMedication} 
                  emptyMessage="No medications found"
                  selectedMedications={selectedMedications}
                  toggleSelection={toggleMedicationSelection}
                />
              </TabsContent>
              
              <TabsContent value="inactive" className="mt-0">
                <MedicationGrid 
                  medications={inactiveMedications} 
                  onSelect={setSelectedMedication} 
                  emptyMessage="No inactive medications found"
                />
              </TabsContent>
            </>
          )}
        </Tabs>
        
        {/* Medication Detail Modal */}
        {selectedMedication && (
          <MedicationDetailModal
            medication={selectedMedication}
            isOpen={!!selectedMedication}
            onClose={() => setSelectedMedication(null)}
          />
        )}
      </div>
    </div>
  );
}

interface MedicationGridProps {
  medications: Medication[];
  onSelect: (medication: Medication) => void;
  emptyMessage: string;
  selectedMedications?: number[];
  toggleSelection?: (id: number) => void;
}

const MedicationGrid = ({ 
  medications, 
  onSelect, 
  emptyMessage, 
  selectedMedications = [], 
  toggleSelection 
}: MedicationGridProps) => {
  if (medications.length === 0) {
    return (
      <div className="py-16 text-center bg-gray-50 rounded-lg">
        <Pill className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {medications.map((medication) => {
        const isSelected = selectedMedications.includes(medication.id);
        const canBeOrdered = medication.refills > 0;
        
        return (
          <Card 
            key={medication.id} 
            className={`overflow-hidden transition-all duration-300 hover:shadow-md ${isSelected ? 'border-primary border-2' : ''}`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {toggleSelection && medication.active && canBeOrdered && (
                    <button 
                      className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                      onClick={() => toggleSelection(medication.id)}
                      aria-label={isSelected ? "Deselect medication" : "Select medication"}
                    >
                      <CheckSquare 
                        className={`h-5 w-5 ${isSelected ? 'text-primary fill-primary' : 'text-gray-300'}`} 
                      />
                    </button>
                  )}
                  <CardTitle className="text-lg">{medication.name}</CardTitle>
                </div>
                {medication.active ? (
                  <Badge className="bg-status-success/10 text-status-success">Active</Badge>
                ) : (
                  <Badge variant="outline">Inactive</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {medication.dosage} · {medication.medicationType}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-1 mb-4">
                <p>
                  <span className="font-medium text-gray-700">Frequency:</span>{" "}
                  <span className="text-gray-600">{medication.frequency}</span>
                </p>
                <p>
                  <span className="font-medium text-gray-700">Instructions:</span>{" "}
                  <span className="text-gray-600">{medication.instructions}</span>
                </p>
                <p>
                  <span className="font-medium text-gray-700">Refills:</span>{" "}
                  <span className={`${medication.refills > 0 ? 'text-gray-600' : 'text-red-500'}`}>
                    {medication.refills} remaining
                  </span>
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => onSelect(medication)}
                  variant="outline"
                >
                  View Details
                </Button>
                {medication.active && (
                  <OrderMedicationButton
                    medication={medication}
                    buttonText="Order"
                    size="sm"
                    variant={canBeOrdered ? "default" : "outline"}
                    className="flex-1"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
