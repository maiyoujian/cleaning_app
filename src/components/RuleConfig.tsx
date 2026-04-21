import { Accordion } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { type Dispatch, type SetStateAction } from 'react'
import { UploadArea, SelectedFile } from '@/components/UploadArea'
import {
    CleaningRules,
    createDefaultRules,
    DataTable,
    CleaningResult
} from '@/lib/cleaning'
import { DownloadIcon, Settings2, CheckCircle2 } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToCSV, exportToExcel } from '@/lib/export'
import { MissingSection } from '@/components/rules/sections/MissingSection'
import { DedupSection } from '@/components/rules/sections/DedupSection'
import { FormatSection } from '@/components/rules/sections/FormatSection'
import { ColumnsSection } from '@/components/rules/sections/ColumnsSection'
import { ResultPreview } from '@/components/ResultPreview'
import { LeftAside } from '@/components/LeftAside'
import { RightAside } from '@/components/RightAside'

interface RuleConfigProps {
    files: SelectedFile[]
    setFiles: Dispatch<SetStateAction<SelectedFile[]>>
    activeFileId: string | null
    onActiveFileIdChange: (id: string) => void
    columns: string[]
    table?: DataTable | null
    value: CleaningRules
    onChange: (value: CleaningRules) => void
    parsingError?: string | null
    isProcessing?: boolean
    onRun: () => void
    previewResult?: CleaningResult
    onBackToRules?: () => void
    onRestart?: () => void
}

export function RuleConfig({
    files,
    setFiles,
    activeFileId,
    onActiveFileIdChange,
    columns,
    table,
    value,
    onChange,
    parsingError,
    isProcessing,
    onRun,
    previewResult,
    onBackToRules,
    onRestart
}: RuleConfigProps) {
    const rules = value ?? createDefaultRules()

    const availableFiles = files.filter((f) => f.status === 'success')
    const activeFile = files.find((f) => f.id === activeFileId) ?? null

    const handleActiveFileChange = (id: string) => {
        onActiveFileIdChange(id)
        // 如果当前处于预览页面，且切换了文件，应该自动返回到规则配置页面
        // 因为新选择的文件还没有应用当前规则或生成清洗结果
        if (previewResult && onBackToRules) {
            onBackToRules()
        }
    }

    const handleAddFiles = (newFiles: any) => {
        setFiles(newFiles)
        // 新添加文件时，如果有正在预览的结果，返回配置页
        if (previewResult && onBackToRules) {
            onBackToRules()
        }
    }

    return (
        <div className="h-full w-full overflow-hidden flex">
            <LeftAside 
                files={files} 
                setFiles={handleAddFiles} 
                activeFileId={activeFileId} 
                onActiveFileIdChange={handleActiveFileChange} 
            />

            <div className="h-full relative flex flex-col flex-1 min-w-[400px]">
                {previewResult ? (
                    <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-50/50">
                        <div className="flex items-center justify-between gap-4 px-8 py-5 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-emerald-50 p-2.5">
                                    <CheckCircle2 className="size-5 text-emerald-600" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-lg font-semibold text-gray-900">
                                        清洗完成
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        以下是 {activeFile?.file.name}{' '}
                                        的清洗结果预览
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {onBackToRules && (
                                    <Button
                                        variant="outline"
                                        onClick={onBackToRules}
                                    >
                                        返回修改规则
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="bg-white">
                                            <DownloadIcon className="size-4 mr-2" />
                                            导出结果
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem 
                                            className="cursor-pointer"
                                            onClick={() => exportToCSV(previewResult.data, activeFile?.file.name.replace(/\.[^/.]+$/, '_cleaned'))}
                                        >
                                            导出为 CSV
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            className="cursor-pointer"
                                            onClick={() => exportToExcel(previewResult.data, activeFile?.file.name.replace(/\.[^/.]+$/, '_cleaned'))}
                                        >
                                            导出为 Excel
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {onRestart && (
                                    <Button
                                        onClick={onRestart}
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                    >
                                        继续处理新文件
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            <ResultPreview result={previewResult} />
                        </div>
                    </div>
                ) : (
                    <section className="flex-1 min-w-0 h-full overflow-y-auto">
                        {availableFiles.length === 0 ? (
                            <UploadArea
                                embedded
                                files={files}
                                setFiles={setFiles}
                            />
                        ) : (
                            <div className="px-10 py-8 flex flex-col gap-4 max-w-4xl mx-auto">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-blue-50 p-2.5">
                                            <Settings2 className="size-5 text-blue-600" />
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-lg font-semibold text-gray-900">
                                                配置清洗规则
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                为当前选中的文件配置规则，后续由
                                                Python 执行
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="lg"
                                        onClick={onRun}
                                        disabled={
                                            !!parsingError ||
                                            columns.length === 0 ||
                                            isProcessing
                                        }
                                    >
                                        <CheckCircle2 data-icon="inline-start" />
                                        {isProcessing
                                            ? '处理中...'
                                            : '配置完成并预览'}
                                    </Button>
                                </div>

                                {parsingError && (
                                    <Alert variant="destructive">
                                        <AlertTitle>无法解析文件</AlertTitle>
                                        <AlertDescription>
                                            {parsingError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Accordion
                                    type="multiple"
                                    defaultValue={['missing']}
                                    className="w-full space-y-10"
                                >
                                    <MissingSection
                                        columns={columns}
                                        value={rules.missing}
                                        onChange={(next) =>
                                            onChange({
                                                ...rules,
                                                missing: next
                                            })
                                        }
                                    />
                                    <DedupSection
                                        columns={columns}
                                        value={rules.dedup}
                                        onChange={(next) =>
                                            onChange({ ...rules, dedup: next })
                                        }
                                    />
                                    <FormatSection
                                        columns={columns}
                                        value={rules.format}
                                        onChange={(next) =>
                                            onChange({ ...rules, format: next })
                                        }
                                    />
                                    <ColumnsSection
                                        columns={columns}
                                        value={rules.columns}
                                        onChange={(next) =>
                                            onChange({
                                                ...rules,
                                                columns: next
                                            })
                                        }
                                    />
                                </Accordion>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <RightAside 
                activeFile={activeFile}
                columns={columns}
                table={table}
                rules={rules}
                previewResult={previewResult}
            />
        </div>
    )
}
