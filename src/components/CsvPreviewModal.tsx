import React from "react";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";

export function CsvPreviewModal({
  open,
  onOpenChange,
  headers,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  headers: string[];
  rows: { [key: string]: string }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogOverlay style={{ backdropFilter: "blur(8px)" }} />
      <DialogContent className="w-full max-w-none md:max-w-[900px] max-h-[80vh] mx-auto p-4 bg-white rounded-lg shadow-lg flex flex-col">
        <DialogTitle>Preview (first 50 rows)</DialogTitle>
        <div className="overflow-x-auto overflow-y-auto mt-4 flex-1 min-h-0">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((header, idx) => (
                  <TableHead key={idx}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rIdx) => (
                <TableRow key={rIdx}>
                  {headers.map((header, cIdx) => (
                    <TableCell key={cIdx}>{row[header]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
