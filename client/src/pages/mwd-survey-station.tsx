import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import type { Well, MWDSurvey } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Compass, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MWDSurveyStationPageProps {
  selectedWell: Well | null;
}

export default function MWDSurveyStationPage({ selectedWell }: MWDSurveyStationPageProps) {
  const searchParams = new URLSearchParams(useSearch());
  const wellId = searchParams.get("wellId") || selectedWell?.id;

  // Fetch surveys for the selected well
  const { data: surveys, isLoading, error } = useQuery<MWDSurvey[]>({
    queryKey: ["/api/surveys", wellId],
    queryFn: async () => {
      if (!wellId || wellId.trim() === "") throw new Error("No well selected");
      const response = await fetch(`/api/surveys/${wellId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch surveys");
      return response.json();
    },
    enabled: !!wellId && wellId.trim() !== "",
  });

  if (!wellId) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please select a well to view survey stations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">
                {error instanceof Error ? error.message : "Failed to load surveys"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Compass className="w-6 h-6 text-cyan-500" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-mwd-survey">
            MWD Survey Station
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Well: {selectedWell?.actualWell || wellId}
          </p>
        </div>
      </div>

      {(!surveys || surveys.length === 0) ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Compass className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No survey stations found for this well</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-400/30">
                {surveys.length} Survey{surveys.length !== 1 ? 's' : ''}
              </Badge>
              Survey Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-survey-name">Survey</TableHead>
                    <TableHead data-testid="header-ipm">IPM</TableHead>
                    <TableHead className="text-right" data-testid="header-md">MD (ft)</TableHead>
                    <TableHead className="text-right" data-testid="header-inclination">Inclination (°)</TableHead>
                    <TableHead className="text-right" data-testid="header-azimuth">Azimuth (°)</TableHead>
                    <TableHead className="text-right" data-testid="header-tvd">TVD (ft)</TableHead>
                    <TableHead className="text-right" data-testid="header-vs">VS (ft)</TableHead>
                    <TableHead className="text-right" data-testid="header-dls">DLS (°/100ft)</TableHead>
                    <TableHead data-testid="header-locked">Locked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey, index) => {
                    const tieOn = survey.tieOn?.tieOn;
                    return (
                      <TableRow key={`${survey.survey}-${index}`} data-testid={`row-survey-${index}`}>
                        <TableCell className="font-medium" data-testid={`cell-survey-name-${index}`}>
                          {survey.survey}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`cell-ipm-${index}`}>
                          {survey.ipm}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm" data-testid={`cell-md-${index}`}>
                          {tieOn?.md?.toFixed(2) || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm" data-testid={`cell-inclination-${index}`}>
                          {tieOn?.inc?.toFixed(3) || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm" data-testid={`cell-azimuth-${index}`}>
                          {tieOn?.azi?.toFixed(3) || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm" data-testid={`cell-tvd-${index}`}>
                          {tieOn?.tvd?.toFixed(2) || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm" data-testid={`cell-vs-${index}`}>
                          {tieOn?.vs?.toFixed(2) || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm" data-testid={`cell-dls-${index}`}>
                          {tieOn?.dls?.toFixed(3) || 'N/A'}
                        </TableCell>
                        <TableCell data-testid={`cell-locked-${index}`}>
                          <Badge variant={survey.locked ? "default" : "outline"} className="text-xs">
                            {survey.locked ? 'Locked' : 'Unlocked'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
