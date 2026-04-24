import { Button } from '@/components/ui/button'
import { DownloadIcon, CheckCircle2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { exportToCSV } from '@/lib/export'
import { ResultPreview } from '@/components/ResultPreview'
import { SelectedFile } from '@/components/UploadArea'
import { CleaningResult, CleaningRules } from '@/lib/cleaning'
import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

interface PreviewViewerProps {
    activeFile: SelectedFile | null
    previewResult: CleaningResult
    activeRules: CleaningRules
    onBackToRules: () => void
    onRestart?: () => void
}

export function PreviewViewer({
    activeFile,
    previewResult,
    activeRules,
    onBackToRules,
    onRestart
}: PreviewViewerProps) {

    const handleNativeExport = async (format: 'csv' | 'xlsx') => {
        if (!activeFile?.path) {
            alert('文件路径丢失，无法执行原生导出，这可能是由于你正在浏览器中运行或者拖拽方式导致无法获取真实路径。你可以使用普通导出。')
            return
        }
        
        try {
            // 生成带时间戳的默认文件名，避免多次导出同名
            const now = new Date()
            const timeStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
            const defaultName = `${activeFile.file.name.replace(/\.[^/.]+$/, "")}_cleaned_${timeStr}.${format}`
            
            const exportPath = await save({
                filters: [{
                    name: format === 'csv' ? 'CSV 文件' : 'Excel 文件',
                    extensions: [format]
                }],
                defaultPath: defaultName
            })

            if (!exportPath) {
                // 用户取消了保存
                return
            }

            console.log('正在全量清洗并导出文件...')
            
            await invoke('export_rust_cleaner', {
                filePath: activeFile.path,
                rulesJson: JSON.stringify(activeRules),
                exportPath: exportPath
            })
            
            alert(`全量数据已成功导出至:\n${exportPath}`)
        } catch (error) {
            console.error('原生导出失败:', error)
            alert(`导出失败: ${error}`)
        }
    }

    return (
        <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-50/50">
            <header className="flex items-center justify-between gap-4 px-8 py-5 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5">
                        <CheckCircle2 className="size-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <div className="text-lg font-semibold text-gray-900">
                            清洗完成
                        </div>
                        <div className="text-sm text-gray-500">
                            以下是 {activeFile?.file.name} 的清洗结果预览
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        className="cursor-pointer"
                        variant="outline"
                        onClick={onBackToRules}
                    >
                        返回修改规则
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="bg-white cursor-pointer"
                            >
                                <DownloadIcon className="size-4 mr-2" />
                                导出结果
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                    // 不再调用 e.preventDefault()，让 DropdownMenu 自然关闭
                                    handleNativeExport('csv')
                                }}
                            >
                                导出为 CSV (全量)
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                    handleNativeExport('xlsx')
                                }}
                            >
                                导出为 Excel (全量)
                            </DropdownMenuItem>
                            <div className="h-px bg-gray-200 my-1" />
                            <DropdownMenuItem
                                className="cursor-pointer text-gray-500"
                                onClick={(e) => {
                                    exportToCSV(
                                        previewResult.data,
                                        activeFile?.file.name
                                    )
                                }}
                            >
                                仅导出当前预览页 (CSV)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {onRestart && (
                        <Button
                            onClick={onRestart}
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer"
                        >
                            继续处理新文件
                        </Button>
                    )}
                </div>
            </header>
            
            <ResultPreview result={previewResult} />
        </div>
    )
}
