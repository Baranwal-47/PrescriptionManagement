import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  id: number;
  orderId: number;
  medicationId: number;
  quantity: number;
  price: number;
  medication?: {
    name: string;
    dosage: string;
  };
}

interface Order {
  id: number;
  userId: number;
  orderDate: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  pharmacy: string;
  totalItems: number;
  items?: OrderItem[];
}

export function useOrders() {
  const { toast } = useToast();
  
  // Get all orders
  const {
    data: orders,
    isLoading,
    error,
  } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });
  
  // Get active orders
  const {
    data: activeOrders,
    isLoading: isLoadingActive,
    error: activeError,
  } = useQuery<Order[]>({
    queryKey: ['/api/orders/active'],
  });
  
  // Get single order by ID with items
  const getOrder = (id: number) => {
    return useQuery<Order>({
      queryKey: [`/api/orders/${id}`],
    });
  };
  
  // Create new order
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      userId: number;
      orderDate: string;
      status: string;
      estimatedDelivery: string;
      pharmacy: string;
      totalItems: number;
      items?: {
        medicationId: number;
        quantity: number;
        price?: number;
      }[];
    }) => {
      const response = await apiRequest('POST', '/api/orders', orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/active'] });
      toast({
        title: 'Order Created',
        description: 'Your order has been placed successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Create Order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  // Update order
  const updateOrderMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Order>;
    }) => {
      const response = await apiRequest('PUT', `/api/orders/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/active'] });
      queryClient.invalidateQueries({ queryKey: [`/api/orders/${data.id}`] });
      toast({
        title: 'Order Updated',
        description: 'Your order has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Update Order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  return {
    orders,
    isLoading,
    error,
    activeOrders,
    isLoadingActive,
    activeError,
    getOrder,
    createOrder: createOrderMutation.mutate,
    isCreating: createOrderMutation.isPending,
    updateOrder: updateOrderMutation.mutate,
    isUpdating: updateOrderMutation.isPending,
  };
}
