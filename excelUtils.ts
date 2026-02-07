
import { PartEntry, ProcessedPart } from "./types";

// Access XLSX from the global window object (loaded via script tag in index.html)
const getXLSX = () => (window as any).XLSX;

export const parseExcelFile = (file: File): Promise<PartEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = getXLSX().read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = getXLSX().utils.sheet_to_json(worksheet);

        // Map and validate columns
        const parts: PartEntry[] = jsonData.map((row: any) => ({
          Part: row.Part || row.part || row['Part Number'] || '',
          Website: row.Website || row.website || row.Websit || ''
        })).filter((p: PartEntry) => p.Part && p.Website);

        resolve(parts);
      } catch (err) {
        reject(new Error("Failed to parse Excel file. Ensure it has 'Part' and 'Website' columns."));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (data: ProcessedPart[]) => {
  const XLSX = getXLSX();
  const exportData = data.map(item => ({
    Part: item.Part,
    Website: item.Website,
    Link: item.Link,
    Lifecycle: item.Lifecycle,
    Datasheet: item.Datasheet
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
  
  // Generate download
  XLSX.writeFile(workbook, `Part_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
};
