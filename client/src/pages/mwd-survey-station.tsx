import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { surveyStationSchema, type SurveyStationInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Calendar, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MWDSurveyStationPageProps {
  selectedWell?: { id: string; actualWell: string } | null;
}

interface SurveyRecord {
  id: string;
  date: string;
  latitude: number;
  longitude: number;
  altitude: number;
  model: string;
}

export default function MWDSurveyStationPage({ selectedWell }: MWDSurveyStationPageProps) {
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<SurveyStationInput>({
    resolver: zodResolver(surveyStationSchema),
    defaultValues: {
      wellName: selectedWell?.actualWell || "",
      latitude: 0,
      longitude: 0,
      altitudeMeters: 0,
      date: new Date().toISOString().split("T")[0],
      model: "WGS84",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SurveyStationInput) => {
      const response = await apiRequest("POST", "/api/survey-station", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Survey station data submitted successfully",
        variant: "default",
      });
      
      const latVal = form.getValues("latitude");
      const longVal = form.getValues("longitude");
      const altVal = form.getValues("altitudeMeters");
      const dateVal = form.getValues("date");
      const modelVal = form.getValues("model");
      
      setSurveys([...surveys, {
        id: Date.now().toString(),
        date: dateVal,
        latitude: latVal,
        longitude: longVal,
        altitude: altVal,
        model: modelVal,
      }]);
      
      setSubmitted(true);
      form.reset({
        wellName: selectedWell?.actualWell || "",
        latitude: 0,
        longitude: 0,
        altitudeMeters: 0,
        date: new Date().toISOString().split("T")[0],
        model: "WGS84",
      });
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit survey station data",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SurveyStationInput) => {
    mutation.mutate(data);
  };

  const deleteSurvey = (id: string) => {
    setSurveys(surveys.filter(s => s.id !== id));
    toast({
      title: "Removed",
      description: "Survey station removed from table",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-mwd-survey">
          MWD Survey Station
        </h1>
        <p className="text-muted-foreground">
          Record magnetic survey stations for well calibration and positioning
        </p>
      </div>

      <Card className="p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Well Name */}
            <FormField
              control={form.control}
              name="wellName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Well Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter well name"
                      {...field}
                      data-testid="input-well-name"
                      disabled={!!selectedWell}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordinates Grid */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="-90 to 90"
                        step="0.0001"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-latitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="-180 to 180"
                        step="0.0001"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-longitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Altitude and Date Grid */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="altitudeMeters"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altitude (Meters)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="-500 to 10000"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-altitude"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        data-testid="input-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Magnetic Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Magnetic Model</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., WGS84, IGRF, User defined"
                      {...field}
                      data-testid="input-model"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-survey"
              >
                <Plus className="w-4 h-4 mr-2" />
                {mutation.isPending ? "Submitting..." : "Add Survey Station"}
              </Button>
              {submitted && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Added successfully</span>
                </div>
              )}
            </div>
          </form>
        </Form>
      </Card>

      {/* Survey Stations Table */}
      {surveys.length > 0 && (
        <Card data-testid="card-survey-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Survey Stations</span>
              <Badge variant="secondary">{surveys.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Latitude</TableHead>
                    <TableHead className="text-xs">Longitude</TableHead>
                    <TableHead className="text-xs">Altitude (m)</TableHead>
                    <TableHead className="text-xs">Model</TableHead>
                    <TableHead className="text-xs w-10">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey) => (
                    <TableRow key={survey.id} data-testid={`row-survey-${survey.id}`}>
                      <TableCell className="text-xs font-mono">{survey.date}</TableCell>
                      <TableCell className="text-xs font-mono">{survey.latitude.toFixed(6)}</TableCell>
                      <TableCell className="text-xs font-mono">{survey.longitude.toFixed(6)}</TableCell>
                      <TableCell className="text-xs font-mono">{survey.altitude.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{survey.model}</TableCell>
                      <TableCell className="text-xs">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteSurvey(survey.id)}
                          data-testid={`button-delete-survey-${survey.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {surveys.length === 0 && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">No survey stations added yet. Add one above to get started.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
