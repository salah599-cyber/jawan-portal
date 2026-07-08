"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { TableSearchInput } from "@/components/platform/table-search-input";
import { TablePagination } from "@/components/platform/table-pagination";
import { RowActions } from "@/components/platform/row-actions";
import { deleteCar, type listCars } from "@/lib/actions/cars";
import { ASSET_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Car = Awaited<ReturnType<typeof listCars>>[number];

function formatPlate(plateCode: string | null, plateNumber: string) {
  return [plateCode, plateNumber].filter(Boolean).join(" ") || plateNumber;
}

export function CarsTable({ cars, showAdd }: { cars: Car[]; showAdd: boolean }) {
  const getSearchText = useCallback(
    (car: Car) =>
      [car.name, car.plateNumber, car.plateCode, car.make, car.model, car.entity.name, car.wilayat, car.governorate, car.status]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const { query, setQuery, filtered } = useSearchFilter(cars, getSearchText);
  const { page, setPage, pageCount, paged, total, pageSize } = usePagination(filtered, { resetKey: query });

  if (cars.length === 0) {
    return <p className="text-sm text-muted-foreground">No vehicles registered yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchInput value={query} onChange={setQuery} placeholder="Search vehicles..." />
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vehicles match your search.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plate</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead>Updated</TableHead>
              {showAdd ? <TableHead className="w-[60px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((car) => (
              <TableRow key={car.id}>
                <TableCell className="font-medium">
                  <Link href={"/cars/" + car.id} className="hover:underline">
                    {car.name}
                  </Link>
                </TableCell>
                <TableCell>{formatPlate(car.plateCode, car.plateNumber)}</TableCell>
                <TableCell>
                  {car.make} {car.model}
                  {car.modelYear ? " (" + car.modelYear + ")" : ""}
                </TableCell>
                <TableCell>
                  {car.wilayat}, {car.governorate}
                </TableCell>
                <TableCell>{car.entity.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ASSET_STATUS_LABELS[car.status] ?? car.status}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatMoney(car.currentValue, car.currency)}</TableCell>
                <TableCell>{car.documents.length}</TableCell>
                <TableCell>{formatDate(car.updatedAt)}</TableCell>
                {showAdd ? (
                  <TableCell>
                    <RowActions
                      editHref={"/cars/" + car.id + "/edit"}
                      itemId={car.id}
                      itemLabel={car.name}
                      deleteAction={deleteCar}
                    />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <TablePagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onPageChange={setPage} />
    </div>
  );
}
