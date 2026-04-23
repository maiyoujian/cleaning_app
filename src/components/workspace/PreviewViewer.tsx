import { Button } from '@/components/ui/button'
import { DownloadIcon, CheckCircle2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToExcel } from '@/lib/export'
import { ResultPreview } from '@/components/ResultPreview'
import { SelectedFile } from '@/components/UploadArea'
import { CleaningResult } from '@/lib/cleaning'

interface PreviewViewerProps {
    activeFile: SelectedFile | null
    previewResult: CleaningResult
    onBackToRules: () => void
    onRestart?: () => void
}

export function PreviewViewer({
    activeFile,
    previewResult,
    onBackToRules,
    onRestart
}: PreviewViewerProps) {
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
                                    e.preventDefault()
                                    exportToCSV(
                                        previewResult.data,
                                        activeFile?.file.name
                                    )
                                }}
                            >
                                导出为 CSV
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault()
                                    exportToExcel(
                                        previewResult.data,
                                        activeFile?.file.name
                                    )
                                }}
                            >
                                导出为 Excel
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
