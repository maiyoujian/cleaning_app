import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { DataTable } from './cleaning'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'

// 检测是否在 Tauri 环境中
function isTauriEnv() {
    try {
        return !!(window as any).__TAURI_INTERNALS__
    } catch {
        return false
    }
}

// 生成唯一的导出文件名
function generateExportFilename(originalFilename: string, extension: string) {
    const baseName = originalFilename
        ? originalFilename.replace(/\.[^/.]+$/, '')
        : 'cleaned_data'
    const date = new Date()
    const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`
    return `${baseName}_cleaned_${timestamp}.${extension}`
}

export async function exportToExcel(table: DataTable, originalFilename?: string) {
    const data = [
        table.columns,
        ...table.rows.map((row) => table.columns.map((col) => row[col]))
    ]

    const ws = XLSX.utils.aoa_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')

    const filename = generateExportFilename(originalFilename || '', 'xlsx')
    
    // Convert workbook to array buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const uint8Array = new Uint8Array(wbout)

    if (isTauriEnv()) {
        try {
            const filePath = await save({
                defaultPath: filename,
                filters: [{
                    name: 'Excel Workbook',
                    extensions: ['xlsx']
                }]
            })
            if (filePath) {
                await writeFile(filePath, uint8Array)
            }
        } catch (err) {
            console.error('Tauri save failed:', err)
        }
    } else {
        // Web fallback
        const blob = new Blob([uint8Array], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
}

export async function exportToCSV(table: DataTable, originalFilename?: string) {
    const data = [
        table.columns,
        ...table.rows.map((row) => table.columns.map((col) => row[col]))
    ]

    const csv = Papa.unparse(data)
    const filename = generateExportFilename(originalFilename || '', 'csv')

    // 添加 BOM 防止 Excel 打开乱码
    const csvContent = '\ufeff' + csv
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(csvContent)

    if (isTauriEnv()) {
        try {
            const filePath = await save({
                defaultPath: filename,
                filters: [{
                    name: 'CSV File',
                    extensions: ['csv']
                }]
            })
            if (filePath) {
                await writeFile(filePath, uint8Array)
            }
        } catch (err) {
            console.error('Tauri save failed:', err)
        }
    } else {
        // Web fallback
        const blob = new Blob([uint8Array], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
}
