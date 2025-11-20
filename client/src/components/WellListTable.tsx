import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export interface Well {
  id: string;
  jobNum: string;
  actualWell: string;
  rig: string;
  operator: string;
  wellStatus: string;
}

interface WellListTableProps {
  wells: Well[];
  onSelectWell: (well: Well) => void;
  selectedWellId?: string;
}

export default function WellListTable({ wells, onSelectWell, selectedWellId }: WellListTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWells = wells.filter(well => {
    const search = searchTerm.toLowerCase();
    return (
      (well.jobNum || '').toLowerCase().includes(search) ||
      (well.actualWell || '').toLowerCase().includes(search) ||
      (well.rig || '').toLowerCase().includes(search) ||
      (well.operator || '').toLowerCase().includes(search)
    );
  });

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    if (status === "EOW Sent") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search wells by job number, name, rig, or operator..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-wells"
        />
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Job Number</TableHead>
              <TableHead className="font-semibold">Well Name</TableHead>
              <TableHead className="font-semibold">Rig</TableHead>
              <TableHead className="font-semibold">Operator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWells.map((well) => (
              <TableRow
                key={well.id}
                onClick={() => onSelectWell(well)}
                className={`cursor-pointer hover-elevate ${selectedWellId === well.id ? 'bg-accent' : ''}`}
                data-testid={`row-well-${well.id}`}
              >
                <TableCell>
                  <Badge variant={getStatusVariant(well.wellStatus)} data-testid={`badge-status-${well.id}`}>
                    {well.wellStatus}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-jobnum-${well.id}`}>{well.jobNum}</TableCell>
                <TableCell data-testid={`text-wellname-${well.id}`}>{well.actualWell}</TableCell>
                <TableCell data-testid={`text-rig-${well.id}`}>{well.rig}</TableCell>
                <TableCell data-testid={`text-operator-${well.id}`}>{well.operator}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="text-sm text-muted-foreground">
        Showing {filteredWells.length} of {wells.length} wells
      </div>
    </div>
  );
}
