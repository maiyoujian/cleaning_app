import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Settings2, CheckCircle2 } from 'lucide-react'
import { MissingSection } from '@/components/rules/sections/MissingSection'
import { DedupSection } from '@/components/rules/sections/DedupSection'
import { FormatSection } from '@/components/rules/sections/FormatSection'
import { ColumnsSection } from '@/components/rules/sections/ColumnsSection'
import { UploadArea, SelectedFile } from '@/components/UploadArea'
import { CleaningRules } from '@/lib/cleaning'

interface RuleEditorProps {
    files: SelectedFile[]
    setFiles: (files: any) => void
    columns: string[]
    rules: CleaningRules
    onChange: (value: CleaningRules) => void
    parsingError?: string | null
    isProcessing?: boolean
    onRun: () => void
}

export function RuleEditor({
    files,
    setFiles,
    columns,
    rules,
    onChange,
    parsingError,
    isProcessing,
    onRun
}: RuleEditorProps) {
    const availableFiles = files.filter((f) => f.status === 'success')

    return (
        <section className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative">
            {availableFiles.length === 0 ? (
                <div className="flex-1 overflow-y-auto">
                    <UploadArea embedded files={files} setFiles={setFiles} />
                </div>
            ) : (
                <>
                    {/* 顶部固定 Header 区域 */}
                    <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] shrink-0 px-8 py-5">
                        <div className="flex items-center justify-between gap-4 w-full">
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-blue-50 p-2.5">
                                    <Settings2 className="size-5 text-blue-600" />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <div className="text-lg font-semibold text-gray-900">
                                        配置清洗规则
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        为当前选中的文件配置规则
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="lg"
                                className="bg-gray-900 hover:bg-gray-800 text-white rounded-lg shadow-sm cursor-pointer"
                                onClick={onRun}
                                disabled={
                                    !!parsingError ||
                                    columns.length === 0 ||
                                    isProcessing
                                }
                            >
                                <CheckCircle2 className="size-4 mr-2" />
                                {isProcessing ? '处理中...' : '配置完成并预览'}
                            </Button>
                        </div>
                    </div>

                    {/* 底部可滚动区域 */}
                    <div className="flex-1 overflow-y-auto px-8 py-8 bg-slate-50/30">
                        <div className="flex flex-col gap-6 w-full">
                            {parsingError && (
                                <Alert variant="destructive">
                                    <AlertTitle>无法解析文件</AlertTitle>
                                    <AlertDescription>
                                        {parsingError}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="w-full flex flex-col gap-10 pb-8 [&_section]:h-fit">
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
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}
