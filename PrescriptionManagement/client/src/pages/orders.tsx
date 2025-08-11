import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface OrderItem {
  id: number;
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
  orderDate: string;
  status: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  totalItems: number;
  trackingNumber?: string;
  pharmacy: string;
  items: OrderItem[];
}

export default function Orders() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Filter orders by status
  const activeOrders = orders?.filter(order => 
    ["ordered", "shipped", "in_transit"].includes(order.status.toLowerCase())
  ) || [];
  
  const completedOrders = orders?.filter(order => 
    order.status.toLowerCase() === "delivered"
  ) || [];

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "ordered":
        return <Badge className="bg-gray-100 text-gray-800">Ordered</Badge>;
      case "shipped":
        return <Badge className="bg-blue-100 text-blue-800">Shipped</Badge>;
      case "in_transit":
        return <Badge className="bg-secondary/10 text-secondary">In Transit</Badge>;
      case "delivered":
        return <Badge className="bg-status-success/10 text-status-success">Delivered</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Orders</h1>
          <p className="text-gray-500">Track your medication orders and deliveries</p>
        </div>
      </div>
      
      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedOrders.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({orders?.length || 0})
          </TabsTrigger>
        </TabsList>
        
        {isLoading ? (
          <div className="space-y-6">
            {Array(3).fill(0).map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <div>
                      <Skeleton className="h-6 w-28 mb-1" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-6 w-24 mt-2 sm:mt-0 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Skeleton className="h-2 w-full rounded mb-1" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex justify-between mb-4">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-9 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="active" className="mt-0 space-y-6">
              <OrderList 
                orders={activeOrders} 
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
                setSelectedOrder={setSelectedOrder}
                emptyMessage="No active orders found"
              />
            </TabsContent>
            
            <TabsContent value="completed" className="mt-0 space-y-6">
              <OrderList 
                orders={completedOrders}
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
                setSelectedOrder={setSelectedOrder}
                emptyMessage="No completed orders found"
              />
            </TabsContent>
            
            <TabsContent value="all" className="mt-0 space-y-6">
              <OrderList 
                orders={orders || []}
                getStatusBadge={getStatusBadge}
                formatCurrency={formatCurrency}
                setSelectedOrder={setSelectedOrder}
                emptyMessage="No orders found"
              />
            </TabsContent>
          </>
        )}
      </Tabs>
      
      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          formatCurrency={formatCurrency}
          getStatusBadge={getStatusBadge}
        />
      )}
    </div>
  );
}

interface OrderListProps {
  orders: Order[];
  getStatusBadge: (status: string) => React.ReactNode;
  formatCurrency: (cents: number) => string;
  setSelectedOrder: (order: Order) => void;
  emptyMessage: string;
}

const OrderList = ({ orders, getStatusBadge, formatCurrency, setSelectedOrder, emptyMessage }: OrderListProps) => {
  if (orders.length === 0) {
    return (
      <div className="py-12 text-center bg-gray-50 rounded-lg">
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {orders.map((order) => {
        // Calculate order progress percentage based on status
        let progressPercentage = 0;
        switch (order.status.toLowerCase()) {
          case "ordered":
            progressPercentage = 25;
            break;
          case "shipped":
            progressPercentage = 50;
            break;
          case "in_transit":
            progressPercentage = 75;
            break;
          case "delivered":
            progressPercentage = 100;
            break;
        }
        
        // Calculate total price
        const totalPrice = order.items.reduce(
          (sum, item) => sum + (item.price * item.quantity), 
          0
        );
        
        // Format dates
        const orderDate = new Date(order.orderDate);
        const formattedOrderDate = format(orderDate, "MMMM d, yyyy");
        
        const estimatedDelivery = order.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
        const formattedEstimatedDelivery = estimatedDelivery ? format(estimatedDelivery, "MMMM d, yyyy") : "N/A";
        
        const actualDelivery = order.actualDelivery ? new Date(order.actualDelivery) : null;
        
        return (
          <Card key={order.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <CardTitle className="text-lg">Order #{order.id}</CardTitle>
                  <p className="text-sm text-gray-500">Ordered on {formattedOrderDate}</p>
                </div>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 mb-1">
                  <div 
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                      order.status.toLowerCase() === "delivered" ? "bg-status-success" : "bg-secondary"
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span className={order.status.toLowerCase() === "ordered" ? "font-medium text-secondary" : ""}>Ordered</span>
                  <span className={order.status.toLowerCase() === "shipped" ? "font-medium text-secondary" : ""}>Shipped</span>
                  <span className={order.status.toLowerCase() === "in_transit" ? "font-medium text-secondary" : ""}>In Transit</span>
                  <span className={order.status.toLowerCase() === "delivered" ? "font-medium text-status-success" : ""}>Delivered</span>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Pharmacy:</span>
                  <span className="text-sm">{order.pharmacy}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Items:</span>
                  <span className="text-sm">{order.totalItems} medications</span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="text-sm font-medium">
                    {order.status.toLowerCase() === "delivered" ? "Delivered on:" : "Estimated delivery:"}
                  </span>
                  <span className="text-sm">
                    {actualDelivery ? format(actualDelivery, "MMMM d, yyyy") : formattedEstimatedDelivery}
                  </span>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={() => setSelectedOrder(order)}
                >
                  View Order Details
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

interface OrderDetailModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  formatCurrency: (cents: number) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

const OrderDetailModal = ({ order, isOpen, onClose, formatCurrency, getStatusBadge }: OrderDetailModalProps) => {
  if (!isOpen) return null;
  
  // Calculate total price
  const subtotal = order.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 
    0
  );
  
  // Apply shipping (free in this example)
  const shipping = 0;
  const total = subtotal + shipping;
  
  // Format dates
  const orderDate = new Date(order.orderDate);
  const formattedOrderDate = format(orderDate, "MMMM d, yyyy");
  
  const estimatedDelivery = order.estimatedDelivery ? new Date(order.estimatedDelivery) : null;
  const formattedEstimatedDelivery = estimatedDelivery ? format(estimatedDelivery, "MMMM d, yyyy") : "N/A";
  
  const actualDelivery = order.actualDelivery ? new Date(order.actualDelivery) : null;
  
  return (
    <div className="fixed z-20 inset-0 overflow-y-auto" onClick={onClose}>
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div 
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-neutral-light px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-sans font-medium text-gray-900">
              Order #{order.id} Details
            </h3>
            <button type="button" className="text-gray-400 hover:text-gray-500" onClick={onClose}>
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <div className="bg-white px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">{formattedOrderDate}</p>
              {getStatusBadge(order.status)}
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Order Status</h4>
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200 mb-1">
                <div 
                  className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                    order.status.toLowerCase() === "delivered" ? "bg-status-success" : "bg-secondary"
                  }`}
                  style={{ 
                    width: order.status.toLowerCase() === "ordered" ? "25%" :
                           order.status.toLowerCase() === "shipped" ? "50%" :
                           order.status.toLowerCase() === "in_transit" ? "75%" : "100%" 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span className={order.status.toLowerCase() === "ordered" ? "font-medium text-secondary" : ""}>Ordered</span>
                <span className={order.status.toLowerCase() === "shipped" ? "font-medium text-secondary" : ""}>Shipped</span>
                <span className={order.status.toLowerCase() === "in_transit" ? "font-medium text-secondary" : ""}>In Transit</span>
                <span className={order.status.toLowerCase() === "delivered" ? "font-medium text-status-success" : ""}>Delivered</span>
              </div>
            </div>
            
            <div className="border-t border-b py-4 my-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Order Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Pharmacy:</span>
                  <span className="font-medium">{order.pharmacy}</span>
                </div>
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tracking Number:</span>
                    <span className="font-medium">{order.trackingNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {order.status.toLowerCase() === "delivered" ? "Delivered:" : "Estimated Delivery:"}
                  </span>
                  <span className="font-medium">
                    {actualDelivery ? format(actualDelivery, "MMMM d, yyyy") : formattedEstimatedDelivery}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="my-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Ordered Items</h4>
              <ul className="space-y-3">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.medication?.name || `Medication #${item.medicationId}`}</p>
                      <p className="text-xs text-gray-500">{item.medication?.dosage} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium">{formatCurrency(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">{shipping > 0 ? formatCurrency(shipping) : "Free"}</span>
                </div>
                <div className="flex justify-between text-base font-medium pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button 
                className="w-full"
                variant={order.status.toLowerCase() === "delivered" ? "outline" : "default"}
                onClick={onClose}
              >
                {order.status.toLowerCase() === "delivered" ? "Close" : "Track Order"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
