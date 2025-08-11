import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Clock, Calendar as CalendarIcon } from "lucide-react";

interface Schedule {
  id: number;
  medicationId: number;
  time: string;
  dayOfWeek: string;
  taken: boolean;
  takenAt: string | null;
  medication: {
    id: number;
    name: string;
    dosage: string;
    instructions: string;
    medicationType: string;
  };
}

export default function Reminders() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  // Format selected date for display
  const formattedDate = format(selectedDate, "EEEE, MMMM d, yyyy");
  
  // Fetch schedules
  const { data: schedules, isLoading } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules/today"],
  });
  
  // Mark medication as taken
  const markAsTakenMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      const response = await apiRequest("PUT", `/api/schedules/${scheduleId}/take`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/today"] });
      toast({
        title: "Medication marked as taken",
        description: "Your medication schedule has been updated."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Filter schedules by taken status
  const takenSchedules = schedules?.filter(schedule => schedule.taken) || [];
  const pendingSchedules = schedules?.filter(schedule => !schedule.taken) || [];
  
  // Group schedules by time
  const groupedByTime = pendingSchedules.reduce((groups, schedule) => {
    const time = schedule.time;
    if (!groups[time]) {
      groups[time] = [];
    }
    groups[time].push(schedule);
    return groups;
  }, {} as Record<string, Schedule[]>);
  
  // Sort times for display
  const sortedTimes = Object.keys(groupedByTime).sort((a, b) => {
    const timeA = a.split(':').map(Number);
    const timeB = b.split(':').map(Number);
    
    if (timeA[0] !== timeB[0]) {
      return timeA[0] - timeB[0];
    }
    return timeA[1] - timeB[1];
  });
  
  // Handle marking medication as taken
  const handleMarkAsTaken = (scheduleId: number) => {
    markAsTakenMutation.mutate(scheduleId);
  };
  
  // Format time for display (24h to 12h)
  const formatTime = (time24h: string) => {
    const [hours, minutes] = time24h.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Medication Reminders</h1>
          <p className="text-gray-500">Track and manage your medication schedule</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center">
          <span className="text-sm mr-2">Notifications</span>
          <Switch 
            checked={notificationsEnabled} 
            onCheckedChange={setNotificationsEnabled} 
            id="notifications" 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule - {formattedDate}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                  <TabsTrigger value="pending">
                    Pending ({pendingSchedules.length})
                  </TabsTrigger>
                  <TabsTrigger value="taken">
                    Taken ({takenSchedules.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="pending" className="mt-0 space-y-6">
                  {isLoading ? (
                    Array(3).fill(0).map((_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-5 w-24" />
                        <div className="border rounded-lg p-4 space-y-3">
                          {Array(2).fill(0).map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Skeleton className="h-5 w-5 rounded mr-3" />
                                <div>
                                  <Skeleton className="h-4 w-32 mb-1" />
                                  <Skeleton className="h-3 w-24" />
                                </div>
                              </div>
                              <Skeleton className="h-8 w-20 rounded" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : sortedTimes.length > 0 ? (
                    sortedTimes.map(time => (
                      <div key={time} className="space-y-2">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-primary" />
                          <h3 className="font-medium text-gray-700">{formatTime(time)}</h3>
                        </div>
                        <div className="border rounded-lg p-4 space-y-3">
                          {groupedByTime[time].map(schedule => (
                            <div key={schedule.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`med-${schedule.id}`}
                                  checked={schedule.taken}
                                  onCheckedChange={() => handleMarkAsTaken(schedule.id)}
                                  disabled={markAsTakenMutation.isPending}
                                  className="mr-3"
                                />
                                <div>
                                  <Label 
                                    htmlFor={`med-${schedule.id}`} 
                                    className="font-medium"
                                  >
                                    {schedule.medication.name}
                                  </Label>
                                  <p className="text-xs text-gray-500">
                                    {schedule.medication.dosage} · {schedule.medication.instructions}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="ml-2">
                                {schedule.medication.medicationType}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No pending medications for today</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="taken" className="mt-0">
                  {isLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : takenSchedules.length > 0 ? (
                    <div className="border rounded-lg p-4 space-y-3">
                      {takenSchedules.map(schedule => (
                        <div key={schedule.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Checkbox 
                              checked={true}
                              disabled
                              className="mr-3"
                            />
                            <div>
                              <p className="font-medium">{schedule.medication.name}</p>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>{formatTime(schedule.time)} · </span>
                                <span className="ml-1">
                                  {schedule.takenAt ? 
                                    `Taken at ${format(new Date(schedule.takenAt), "h:mm a")}` : 
                                    "Taken today"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-green-50">
                            Completed
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center bg-gray-50 rounded-lg">
                      <p className="text-gray-500">No medications taken today</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Medication Reminder Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">Get Notified</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Receive timely reminders when it's time to take your medication
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-primary/5">5 minutes before</Badge>
                    <Badge variant="outline" className="bg-primary/5">At scheduled time</Badge>
                    <Badge variant="outline" className="bg-primary/5">15 minutes after missed</Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-secondary/10 p-3 rounded-full">
                  <CalendarIcon className="h-6 w-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">Daily, Weekly & Monthly Views</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    Plan ahead with different calendar views for your medication schedule
                  </p>
                  <Button variant="outline" size="sm">
                    Configure Calendar View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
              
              <div className="mt-4">
                <h3 className="font-medium mb-2">Schedule Overview</h3>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-3">
                      {formattedDate}
                    </p>
                    <div className="space-y-1">
                      <p className="text-sm flex justify-between">
                        <span>Total medications:</span>
                        <span className="font-medium">{schedules?.length || 0}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span>Taken:</span>
                        <span className="font-medium">{takenSchedules.length}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span>Pending:</span>
                        <span className="font-medium">{pendingSchedules.length}</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
