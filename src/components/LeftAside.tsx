import { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UploadArea, SelectedFile } from '@/components/UploadArea'
import { cn } from '@/lib/utils'

interface LeftAsideProps {
    files: SelectedFile[]
    setFiles: Dispatch<SetStateAction<SelectedFile[]>>
    activeFileId: string | null
    onActiveFileIdChange: (id: string) => void
}

export function LeftAside({
    files,
    setFiles,
    activeFileId,
    onActiveFileIdChange
}: LeftAsideProps) {
    const availableFiles = files.filter((f) => f.status === 'success')

    const [width, setWidth] = useState(300)
    const isResizing = useRef(false)
    const sidebarRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing.current || !sidebarRef.current) return
            const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left
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
        <aside ref={sidebarRef} style={{ width, flexShrink: 0 }} className="relative h-full flex flex-col p-4 border-r border-gray-200 bg-slate-50/50 group">
            <div 
                className="w-2 bg-transparent hover:bg-blue-400 cursor-col-resize transition-colors absolute right-[-4px] top-0 bottom-0 z-10 opacity-0 group-hover:opacity-100"
                onMouseDown={() => {
                    isResizing.current = true
                    document.body.style.cursor = 'col-resize'
                }}
            />
            <div className="mb-4 shrink-0">
                <div className="text-base font-semibold text-gray-900">文件列表</div>
                <div className="text-xs text-gray-500 mt-1">共 {availableFiles.length} 个文件</div>
            </div>

            {availableFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1">
                    {availableFiles.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => onActiveFileIdChange(f.id)}
                            className={cn(
                                'px-3 py-2.5 rounded-lg text-sm text-left transition-colors flex items-center gap-3 cursor-pointer shrink-0',
                                activeFileId === f.id
                                    ? 'bg-blue-100/50 text-blue-700 font-medium'
                                    : 'hover:bg-slate-100 text-slate-700'
                            )}
                        >
                            <FileText className={cn("size-4 shrink-0", activeFileId === f.id ? "text-blue-500" : "text-gray-400")} />
                            <span className="truncate flex-1">{f.file.name}</span>
                        </button>
                    ))}
                </div>
            )}
            <div className="mt-4 px-1 shrink-0 flex flex-col gap-2">
                <UploadArea embedded files={files} setFiles={setFiles} hideUI />
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs flex items-center justify-center gap-2 cursor-pointer"
                    onClick={() => {
                        const fileInput = sidebarRef.current?.querySelector('input[type="file"][multiple]') as HTMLInputElement
                        if (fileInput) fileInput.click()
                    }}
                >
                    <FileText className="size-3" />
                    添加文件
                </Button>
            </div>
        </aside>
    )
}
