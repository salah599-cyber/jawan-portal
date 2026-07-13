import type { ReportResult, ReportSection } from "@/lib/reports/types";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function SectionTable({ section }: { section: ReportSection }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {section.metrics && section.metrics.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {section.metrics.map((metric) => (
              <div key={metric.label} className="rounded-md border p-3">
                <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                <p className="text-lg font-semibold">{metric.value}</p>
                {metric.detail ? (
                  <p className="text-xs text-muted-foreground">{metric.detail}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {section.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data for this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {section.columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.rows.map((row, index) => (
                  <TableRow key={index}>
                    {section.columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={column.align === "right" ? "text-right" : undefined}
                      >
                        {row[column.key] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportPreview({ result }: { result: ReportResult }) {
  return (
    <div className="space-y-4 print:space-y-2" id="report-preview">
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">{result.title}</h1>
        <p className="text-sm text-muted-foreground">{result.description}</p>
        <p className="text-xs text-muted-foreground">
          Generated {formatDate(result.generatedAt)}
          {result.entityName ? ` · ${result.entityName}` : ""}
        </p>
      </div>

      {result.metrics.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
          {result.metrics.map((metric) => (
            <Card key={metric.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{metric.value}</p>
                {metric.detail ? (
                  <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{result.sections?.length ? "Scorecard" : "Data"}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {result.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data for the selected filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {result.columns.map((column) => (
                    <TableHead
                      key={column.key}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.map((row, index) => (
                  <TableRow key={index}>
                    {result.columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={column.align === "right" ? "text-right" : undefined}
                      >
                        {row[column.key] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {result.sections?.map((section) => (
        <SectionTable key={section.title} section={section} />
      ))}

      {result.footnotes.length > 0 ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          {result.footnotes.map((note) => (
            <p key={note}>• {note}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
