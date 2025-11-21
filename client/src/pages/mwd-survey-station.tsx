import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { surveyStationSchema, type SurveyStationInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { MapPin, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

interface MWDSurveyStationPageProps {
  selectedWell?: { id: string; actualWell: string } | null;
}

export default function MWDSurveyStationPage({ selectedWell }: MWDSurveyStationPageProps) {
  const { toast } = useToast();
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
      setSubmitted(true);
      form.reset();
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

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-mwd-survey">
          MWD Survey Station
        </h1>
        <p className="text-muted-foreground">
          Enter magnetic survey station data for calibration and positioning
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
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Well Name
                  </FormLabel>
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
                {mutation.isPending ? "Submitting..." : "Submit Survey Station"}
              </Button>
              {submitted && (
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Submitted successfully</span>
                </div>
              )}
            </div>
          </form>
        </Form>

        {mutation.isError && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{mutation.error instanceof Error ? mutation.error.message : "An error occurred"}</span>
          </div>
        )}
      </Card>

      <Card className="p-4 bg-muted">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Station Information</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Latitude/Longitude: Geographic coordinates (decimal degrees)</li>
            <li>• Altitude: Elevation in meters above sea level</li>
            <li>• Date: Date of survey station measurement</li>
            <li>• Model: Magnetic field model used for reference</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
