import Link from "next/link";
import type { ReportDefinition } from "@/lib/reports/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileSpreadsheet } from "lucide-react";

export function ReportCard({ report }: { report: ReportDefinition }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          {report.title}
        </CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/reports/${report.id}`}>
            Open report
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
