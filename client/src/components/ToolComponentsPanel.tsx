import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface ToolComponent {
  name: string;
  sn: string;
  snOverride: string;
  lih: string;
  failure: string;
  npt: string;
}

interface ToolComponentsPanelProps {
  components: ToolComponent[];
}

export default function ToolComponentsPanel({ components }: ToolComponentsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tool Components</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Tool Component</TableHead>
                <TableHead className="font-semibold">SN</TableHead>
                <TableHead className="font-semibold">SN Override</TableHead>
                <TableHead className="font-semibold">LIH: NO</TableHead>
                <TableHead className="font-semibold">Failure</TableHead>
                <TableHead className="font-semibold">NPT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.map((component, idx) => (
                <TableRow key={idx} data-testid={`row-tool-${idx}`}>
                  <TableCell className="font-medium" data-testid={`text-tool-name-${idx}`}>{component.name}</TableCell>
                  <TableCell className="font-mono text-sm" data-testid={`text-tool-sn-${idx}`}>{component.sn}</TableCell>
                  <TableCell className="font-mono text-sm" data-testid={`text-tool-override-${idx}`}>{component.snOverride}</TableCell>
                  <TableCell data-testid={`text-tool-lih-${idx}`}>{component.lih}</TableCell>
                  <TableCell data-testid={`text-tool-failure-${idx}`}>
                    {component.failure === 'None' ? (
                      <Badge variant="secondary">None</Badge>
                    ) : (
                      <Badge variant="destructive">{component.failure}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-sm" data-testid={`text-tool-npt-${idx}`}>{component.npt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
