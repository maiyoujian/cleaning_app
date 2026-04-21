import { useState, useRef, useEffect } from 'react'
import { SelectedFile } from '@/components/UploadArea'
import { CleaningRules, DataTable, CleaningResult } from '@/lib/cleaning'

interface RightAsideProps {
    activeFile: SelectedFile | null
    columns: string[]
    table?: DataTable | null
    rules: CleaningRules
    previewResult?: CleaningResult
}

export function RightAside({
    activeFile,
    columns,
    table,
    rules,
    previewResult
}: RightAsideProps) {
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const [width, setWidth] = useState(300)
    const isResizing = useRef(false)
    const sidebarRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current || !sidebarRef.current) return
            const newWidth = sidebarRef.current.getBoundingClientRect().right - e.clientX
            if (newWidth >= 200 && newWidth <= 600) {
                setWidth(newWidth)
            }
        }
        const handleMouseUp = () => {
            isResizing.current = false
            document.body.style.cursor = 'default'
        }
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [])

    return (
        <div ref={sidebarRef} style={{ width, flexShrink: 0 }} className="relative h-full flex group border-l border-gray-200">
            <div 
                className="w-2 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors absolute left-[-4px] top-0 bottom-0 z-10 opacity-0 group-hover:opacity-100"
                onMouseDown={() => {
                    isResizing.current = true
                    document.body.style.cursor = 'col-resize'
                }}
            />
            <aside className="h-full bg-slate-50/50 overflow-y-auto w-full">
                <div className="px-5 py-4 border-b border-gray-200/60">
                    <div className="text-base font-semibold text-gray-900">文件信息</div>
                    <div className="text-xs text-gray-500 mt-1">当前配置项的状态总览</div>
                </div>
                <div className="p-5 flex flex-col gap-6">
                {activeFile ? (
                    <div className="flex flex-col gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">文件名：</span>
                                <span className="font-medium text-gray-900 truncate max-w-[120px]" title={activeFile.file.name}>{activeFile.file.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">文件大小：</span>
                                <span className="font-medium text-gray-900">{formatFileSize(activeFile.file.size)}</span>
                            </div>
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
                        </div>

                        {rules.dedup.enabled && rules.dedup.columns.length > 0 && (
                            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 flex flex-col gap-2">
                                <span className="text-sm font-medium text-blue-700">已选择去重字段</span>
                                <span className="text-sm text-blue-600/80 break-all leading-relaxed">
                                    {rules.dedup.columns.join('，')}
                                </span>
                            </div>
                        )}

                        <div className="pt-5 border-t border-gray-200/60">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900">预计结果</h3>
                                <button className="text-xs text-gray-500 hover:text-blue-600 transition-colors">查看预览</button>
                            </div>
                            <p className="text-xs text-gray-500 mb-4 leading-relaxed">预计影响去重后的保留与删除数量（仅供参考）</p>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-blue-500"></span>
                                        <span className="text-gray-700">保留</span>
                                    </div>
                                    <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full border border-blue-100/50">
                                        {previewResult ? previewResult.stats.rowsAfter : (table ? table.rows.length : '-')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="size-2 rounded-full bg-red-400"></span>
                                        <span className="text-gray-700">删除</span>
                                    </div>
                                    <span className="inline-flex items-center justify-center bg-red-50 text-red-600 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-100/50">
                                        {previewResult ? (previewResult.stats.rowsBefore - previewResult.stats.rowsAfter) : 0}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-5 bg-white border border-gray-100 shadow-sm rounded-lg p-3 text-xs text-gray-600 flex items-center gap-2">
                                <span>精简率</span>
                                <span className="font-medium text-gray-900">
                                    {previewResult ? 
                                        ((previewResult.stats.rowsBefore - previewResult.stats.rowsAfter) / previewResult.stats.rowsBefore * 100).toFixed(1) + '%' 
                                        : '0%'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500 text-center py-8">请先选择一个文件</div>
                )}
                </div>
            </aside>
        </div>
    )
}