import { useState, useRef, useEffect } from 'react'
import { SelectedFile } from '@/components/UploadArea'
import { CleaningRules, DataTable, CleaningResult } from '@/lib/cleaning'
import { RuleConfigSidebar } from './aside/RuleConfigSidebar'
import { PreviewResultSidebar } from './aside/PreviewResultSidebar'

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
                    <div className="text-base font-semibold text-gray-900">{previewResult ? '处理报告' : '文件信息'}</div>
                    <div className="text-xs text-gray-500 mt-1">{previewResult ? '数据清洗执行结果与统计' : '当前配置项的状态总览'}</div>
                </div>
                <div className="p-5 flex flex-col gap-6">
                {activeFile ? (
                    previewResult ? (
                        <PreviewResultSidebar activeFile={activeFile} previewResult={previewResult} />
                    ) : (
                        <RuleConfigSidebar activeFile={activeFile} columns={columns} table={table} rules={rules} />
                    )
                ) : (
                    <div className="text-sm text-gray-500 text-center py-8">请先选择一个文件</div>
                )}
                </div>
            </aside>
        </div>
    )
}