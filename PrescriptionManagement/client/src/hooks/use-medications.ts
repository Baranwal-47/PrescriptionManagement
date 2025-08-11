import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Medication {
  id: number;
  prescriptionId: number;
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

interface MedicationDetail extends Medication {
  schedules: Schedule[];
}

interface Schedule {
  id: number;
  medicationId: number;
  time: string;
  dayOfWeek: string;
  taken: boolean;
  takenAt?: string;
}

export function useMedications() {
  const { toast } = useToast();
  
  // Get all medications
  const {
    data: medications,
    isLoading,
    error,
  } = useQuery<Medication[]>({
    queryKey: ['/api/medications'],
  });
  
  // Get single medication by ID with schedules
  const getMedication = (id: number) => {
    return useQuery<MedicationDetail>({
      queryKey: [`/api/medications/${id}`],
    });
  };
  
  // Create new medication
  const createMedicationMutation = useMutation({
    mutationFn: async (medicationData: {
      prescriptionId: number;
      userId: number;
      name: string;
      dosage: string;
      frequency: string;
      instructions: string;
      refills: number;
      startDate: string;
      endDate?: string;
      pharmacy?: string;
      active: boolean;
      medicationType: string;
    }) => {
      const response = await apiRequest('POST', '/api/medications', medicationData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
      toast({
        title: 'Medication Added',
        description: 'Your medication has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Add Medication',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Update medication
  const updateMedicationMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Medication>;
    }) => {
      const response = await apiRequest('PUT', `/api/medications/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
      queryClient.invalidateQueries({ queryKey: [`/api/medications/${data.id}`] });
      toast({
        title: 'Medication Updated',
        description: 'Your medication has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Medication',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Mark medication as taken
  const takeMedicationMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest('PUT', `/api/schedules/${scheduleId}/take`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedules/today'] });
      toast({
        title: 'Medication Taken',
        description: 'Your medication has been marked as taken.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Mark Medication',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Get today's schedule
  const {
    data: todaySchedules,
    isLoading: isLoadingSchedules,
    error: schedulesError,
  } = useQuery<(Schedule & { medication: Medication })[]>({
    queryKey: ['/api/schedules/today'],
  });
  
  return {
    medications,
    isLoading,
    error,
    getMedication,
    createMedication: createMedicationMutation.mutate,
    isCreating: createMedicationMutation.isPending,
    updateMedication: updateMedicationMutation.mutate,
    isUpdating: updateMedicationMutation.isPending,
    takeMedication: takeMedicationMutation.mutate,
    isTaking: takeMedicationMutation.isPending,
    todaySchedules,
    isLoadingSchedules,
    schedulesError,
  };
}
