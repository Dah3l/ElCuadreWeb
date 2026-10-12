/// <reference types="vite/client" />

declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';
  
  interface AutoTableOptions {
    head?: string[][];
    body?: string[][];
    startY?: number;
    styles?: Record<string, unknown>;
    headStyles?: Record<string, unknown>;
    theme?: string;
  }
  
  module 'jspdf' {
    interface jsPDF {
      autoTable(options: AutoTableOptions): jsPDF;
    }
  }
}
