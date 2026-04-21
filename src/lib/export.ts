import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { DataTable } from './cleaning'

export function exportToExcel(table: DataTable, filename: string = 'cleaned_data') {
    // We need to convert our DataTable format to an array of objects
    // or an array of arrays.
    const data = [
        table.columns,
        ...table.rows.map(row => table.columns.map(col => row[col]))
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Data")
    
    // Generate buffer and save
    XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToCSV(table: DataTable, filename: string = 'cleaned_data') {
    const data = [
        table.columns,
        ...table.rows.map(row => table.columns.map(col => row[col]))
    ]
    
    const csv = Papa.unparse(data)
    
    // Create a blob and trigger download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
