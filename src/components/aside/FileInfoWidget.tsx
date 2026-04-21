import { SelectedFile } from '@/components/UploadArea'
import { DataTable } from '@/lib/cleaning'

export function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

interface FileInfoWidgetProps {
    activeFile: SelectedFile
    columns?: string[]
    table?: DataTable | null
}

export function FileInfoWidget({ activeFile, columns, table }: FileInfoWidgetProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">文件名：</span>
                <span className="font-medium text-gray-900 truncate max-w-[120px]" title={activeFile.file.name}>
                    {activeFile.file.name}
                </span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">文件大小：</span>
                <span className="font-medium text-gray-900">{formatFileSize(activeFile.file.size)}</span>
            </div>
            
            {table !== undefined && columns !== undefined && (
                <>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">数据行数：</span>
                        <span className="inline-flex items-center justify-center bg-white text-gray-700 border border-gray-200 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
                            {table ? table.rows.length : '-'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">列数：</span>
                        <span className="inline-flex items-center justify-center bg-white text-gray-700 border border-gray-200 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
                            {columns.length}
                        </span>
                    </div>
                </>
            )}
        </div>
    )
}
