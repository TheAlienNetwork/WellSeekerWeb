import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface BHAComponent {
  num: number;
  bha: number;
  description: string;
  nm: string;
  id: string;
  od: string;
  length: string;
  toBit: string;
}

interface BHADataTableProps {
  components: BHAComponent[];
  selectedBHA: number;
  availableBHAs: number[];
  onSelectBHA: (bha: number) => void;
}

export default function BHADataTable({ components, selectedBHA, availableBHAs, onSelectBHA }: BHADataTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Label htmlFor="bha-select">BHA / Run Number:</Label>
        <Select value={selectedBHA.toString()} onValueChange={(val) => onSelectBHA(parseInt(val))}>
          <SelectTrigger id="bha-select" className="w-32" data-testid="select-bha">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableBHAs.map(bha => (
              <SelectItem key={bha} value={bha.toString()}>BHA {bha}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold w-16">#</TableHead>
              <TableHead className="font-semibold w-16">BHA</TableHead>
              <TableHead className="font-semibold">Description</TableHead>
              <TableHead className="font-semibold w-20">NM</TableHead>
              <TableHead className="font-semibold w-24">ID</TableHead>
              <TableHead className="font-semibold w-24">OD</TableHead>
              <TableHead className="font-semibold w-28">Length</TableHead>
              <TableHead className="font-semibold w-28">To Bit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {components.map((component) => (
              <TableRow key={component.num} data-testid={`row-bha-component-${component.num}`}>
                <TableCell className="font-mono text-sm" data-testid={`text-num-${component.num}`}>{component.num}</TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-bha-${component.num}`}>{component.bha}</TableCell>
                <TableCell data-testid={`text-description-${component.num}`}>{component.description}</TableCell>
                <TableCell className="text-center" data-testid={`text-nm-${component.num}`}>{component.nm}</TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-id-${component.num}`}>{component.id}</TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-od-${component.num}`}>{component.od}</TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-length-${component.num}`}>{component.length}</TableCell>
                <TableCell className="font-mono text-sm" data-testid={`text-tobit-${component.num}`}>{component.toBit}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
