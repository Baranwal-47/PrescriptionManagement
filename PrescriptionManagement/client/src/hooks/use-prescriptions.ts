import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Prescription {
  id: number;
  doctorName: string;
  date: string;
  status: string;
  notes?: string;
  imageUrl?: string;
  medicationCount: number;
}

interface PrescriptionDetail extends Prescription {
  medications: Medication[];
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
}

export function usePrescriptions() {
  const { toast } = useToast();
  
  // Get all prescriptions
  const {
    data: prescriptions,
    isLoading,
    error,
  } = useQuery<Prescription[]>({
    queryKey: ['/api/prescriptions'],
  });
  
  // Get single prescription by ID
  const getPrescription = (id: number) => {
    return useQuery<PrescriptionDetail>({
      queryKey: [`/api/prescriptions/${id}`],
    });
  };
  
  // Create new prescription
  const createPrescriptionMutation = useMutation({
    mutationFn: async (prescriptionData: {
      userId: number;
      doctorName: string;
      date: string;
      status: string;
      notes?: string;
      imageUrl?: string;
    }) => {
      const response = await apiRequest('POST', '/api/prescriptions', prescriptionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      toast({
        title: 'Prescription Created',
        description: 'Your prescription has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Prescription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Update prescription
  const updatePrescriptionMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Prescription>;
    }) => {
      const response = await apiRequest('PUT', `/api/prescriptions/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: [`/api/prescriptions/${data.id}`] });
      toast({
        title: 'Prescription Updated',
        description: 'Your prescription has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Prescription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Scan and process prescription
  const scanPrescriptionMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await apiRequest('POST', '/api/scan-prescription', {
        image: imageData,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedules/today'] });
      toast({
        title: 'Prescription Scanned Successfully',
        description: `${data.medications.length} medications found.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Scan Prescription',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  return {
    prescriptions,
    isLoading,
    error,
    getPrescription,
    createPrescription: createPrescriptionMutation.mutate,
    isCreating: createPrescriptionMutation.isPending,
    updatePrescription: updatePrescriptionMutation.mutate,
    isUpdating: updatePrescriptionMutation.isPending,
    scanPrescription: scanPrescriptionMutation.mutate,
    isScanning: scanPrescriptionMutation.isPending,
  };
}
