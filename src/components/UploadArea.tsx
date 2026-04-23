import { FileSpreadsheet, CheckCircle2, X, AlertCircle } from 'lucide-react'
import {
    useRef,
    useState,
    useEffect,
    type Dispatch,
    type SetStateAction
} from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getCurrentWindow } from '@tauri-apps/api/window'

export type FileStatus = 'reading' | 'success' | 'error'

export interface SelectedFile {
    id: string
    file: File
    status: FileStatus
    errorMessage?: string
    path?: string
}

interface UploadAreaProps {
    files: SelectedFile[]
    setFiles: Dispatch<SetStateAction<SelectedFile[]>>
    embedded?: boolean
    hideUI?: boolean
}

export function UploadArea({
    files: selectedFiles,
    setFiles: setSelectedFiles,
    embedded,
    hideUI
}: UploadAreaProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const uploadZoneRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const zone = uploadZoneRef.current
        if (!zone) return

        const handleDragOverWindow = (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy'
            }
        }

        const handleDropWindow = async (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
            dragCounter.current = 0

            const files: File[] = []

            if (e.dataTransfer) {
                if (e.dataTransfer.items) {
                    const promises: Promise<void>[] = []

                    const traverseFileTree = (
                        item: any,
                        path?: string
                    ): Promise<void> => {
                        return new Promise((resolve) => {
                            if (item.isFile) {
                                item.file((file: File) => {
                                    files.push(file)
                                    resolve()
                                })
                            } else if (item.isDirectory) {
                                const dirReader = item.createReader()
                                dirReader.readEntries((entries: any[]) => {
                                    const entriesPromises = entries.map(
                                        (entry) =>
                                            traverseFileTree(
                                                entry,
                                                path
                                                    ? path + item.name + '/'
                                                    : item.name + '/'
                                            )
                                    )
                                    Promise.all(entriesPromises).then(() =>
                                        resolve()
                                    )
                                })
                            } else {
                                resolve()
                            }
                        })
                    }

                    Array.from(e.dataTransfer.items).forEach((item) => {
                        if (item.kind === 'file') {
                            const entry =
                                item.webkitGetAsEntry?.() ||
                                (item as any).getAsEntry?.()
                            if (entry) {
                                promises.push(traverseFileTree(entry))
                            } else {
                                const file = item.getAsFile()
                                if (file) files.push(file)
                            }
                        }
                    })

                    await Promise.all(promises)
                } else if (e.dataTransfer.files) {
                    Array.from(e.dataTransfer.files).forEach((file) => {
                        files.push(file)
                    })
                }
            }

            const validFiles = files.filter((file) => {
                const name = file.name.toLowerCase()
                return (
                    name.endsWith('.xlsx') ||
                    name.endsWith('.xls') ||
                    name.endsWith('.csv')
                )
            })

            if (validFiles.length > 0) {
                addFiles(validFiles.map((file) => ({ file })))
            }
        }

        const handleDragEnterZone = (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            dragCounter.current++
            setIsDragging(true)
        }

        const handleDragLeaveZone = (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            dragCounter.current--
            if (dragCounter.current <= 0) {
                dragCounter.current = 0
                setIsDragging(false)
            }
        }

        zone.addEventListener('dragenter', handleDragEnterZone)
        zone.addEventListener('dragover', handleDragOverWindow)
        zone.addEventListener('dragleave', handleDragLeaveZone)
        zone.addEventListener('drop', handleDropWindow)

        return () => {
            zone.removeEventListener('dragenter', handleDragEnterZone)
            zone.removeEventListener('dragover', handleDragOverWindow)
            zone.removeEventListener('dragleave', handleDragLeaveZone)
            zone.removeEventListener('drop', handleDropWindow)
        }
    }, [])

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const addFiles = (items: Array<{ file: File; path?: string }>) => {
        const newFiles: SelectedFile[] = items.map(({ file, path }) => ({
            file,
            path,
            status: 'success' as const,
            id: Math.random().toString(36).substring(7)
        }))

        setSelectedFiles((prev) => [...prev, ...newFiles])
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const validFiles = Array.from(e.target.files).filter((file) => {
                const name = file.name.toLowerCase()
                return (
                    name.endsWith('.xlsx') ||
                    name.endsWith('.xls') ||
                    name.endsWith('.csv')
                )
            })
            if (validFiles.length > 0) {
                addFiles(validFiles.map((file) => ({ file })))
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const dragCounter = useRef(0)

    useEffect(() => {
        let unlisten: (() => void) | undefined

        const setupTauriDragAndDrop = async () => {
            try {
                unlisten = await getCurrentWindow().onDragDropEvent((event) => {
                    if (event.payload.type === 'enter') {
                        setIsDragging(true)
                    } else if (event.payload.type === 'leave') {
                        setIsDragging(false)
                    } else if (event.payload.type === 'drop') {
                        setIsDragging(false)
                        const paths = event.payload.paths
                        if (paths && paths.length > 0) {
                            const validPaths = paths.filter((path) => {
                                const lower = path.toLowerCase()
                                return (
                                    lower.endsWith('.xlsx') ||
                                    lower.endsWith('.xls') ||
                                    lower.endsWith('.csv')
                                )
                            })

                            if (validPaths.length > 0) {
                                const newItems = validPaths.map((path) => {
                                    const name =
                                        path.split(/[\\/]/).pop() || path
                                    return { file: new File([], name), path }
                                })
                                addFiles(newItems)
                            }
                        }
                    }
                })
            } catch (error) {
                console.error('Failed to setup Tauri drag and drop:', error)
            }
        }

        setupTauriDragAndDrop()

        return () => {
            if (unlisten) {
                unlisten()
            }
        }
    }, [])

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleRemoveFile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedFiles((prev) => prev.filter((f) => f.id !== id))
    }

    if (hideUI) {
        return (
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                multiple
                className="hidden"
            />
        )
    }

    return (
        <div
            className={cn(
                embedded
                    ? 'h-full flex-col p-8 flex justify-center items-center'
                    : 'flex flex-col gap-6 mt-6',
                embedded
                    ? 'w-full max-w-3xl mx-auto flex justify-center items-center'
                    : 'p-8 bg-white rounded-2xl shadow-sm border border-gray-100'
            )}
        >
            <div className={cn(embedded ? 'mb-8' : 'mb-6', 'shrink-0')}>
                <h2 className="text-xl font-semibold text-gray-900 text-center">
                    选择数据文件
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                    支持 .xlsx、.xls、.csv • 首行作为表头 • 支持中英文
                </p>
            </div>

            <div
                ref={uploadZoneRef}
                onClick={handleClick}
                className={cn(
                    'py-12 border-2 border-dashed transition-colors rounded-2xl flex flex-col items-center justify-center relative cursor-pointer w-full',
                    isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-blue-200/60 bg-blue-50/30 hover:bg-blue-50/60'
                )}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls,.csv"
                    multiple
                    className="hidden"
                />

                <FileSpreadsheet
                    className="size-8 text-gray-400 mb-6 bg-white p-1.5 rounded-xl shadow-sm pointer-events-none box-content"
                    strokeWidth={1.5}
                />

                <h3 className="text-base font-medium text-gray-900 pointer-events-none">
                    拖拽文件到这里，或点击选择文件
                </h3>
                <div className="flex gap-4 mt-3 pointer-events-none">
                    <Button
                        className="cursor-pointer pointer-events-auto"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation()
                            fileInputRef.current?.click()
                        }}
                    >
                        选择文件
                    </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center pointer-events-none">
                    支持一次选择多个文件，也可以多次添加
                </p>

                <div className="flex gap-3 mt-6 pointer-events-none">
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-xs text-gray-500 shadow-sm">
                        .xlsx
                    </span>
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-xs text-gray-500 shadow-sm">
                        .xls
                    </span>
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-xs text-gray-500 shadow-sm">
                        .csv
                    </span>
                </div>

                {isDragging && (
                    <div className="absolute inset-0 bg-blue-500/10 border-2 border-blue-500 border-dashed rounded-2xl pointer-events-none z-10" />
                )}
            </div>

            {selectedFiles.length > 0 && (
                <div className="mt-8 flex flex-col gap-3 flex-1 min-h-0">
                    <h4 className="text-sm font-medium text-gray-700 px-1 shrink-0">
                        已选择的文件 ({selectedFiles.length})
                    </h4>
                    <div className="flex flex-col gap-2 pr-1 overflow-y-auto min-h-0 h-full">
                        {selectedFiles.map((item) => (
                            <div
                                key={item.id}
                                className="border border-gray-100 rounded-xl p-3.5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => {
                                    // Make file item clickable to trigger its selection
                                    // For simplicity we just ensure cursor-pointer
                                }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <FileSpreadsheet
                                        className="size-5 text-blue-500 bg-white p-1.5 rounded-lg shadow-sm shrink-0 box-content"
                                        strokeWidth={1.5}
                                    />
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <span
                                            className="text-sm font-medium text-gray-900 truncate"
                                            title={item.path || item.file.name}
                                        >
                                            {item.file.name}
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-500">
                                            <span>
                                                {formatFileSize(item.file.size)}
                                            </span>
                                            <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                            {item.status === 'reading' && (
                                                <span className="text-blue-500 flex items-center gap-1.5 font-medium">
                                                    <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                    读取中...
                                                </span>
                                            )}
                                            {item.status === 'success' && (
                                                <span className="text-green-500 flex items-center gap-1 font-medium">
                                                    <CheckCircle2 className="size-3" />
                                                    读取成功
                                                </span>
                                            )}
                                            {item.status === 'error' && (
                                                <span className="text-red-500 flex items-center gap-1 font-medium">
                                                    <AlertCircle className="size-3" />
                                                    读取失败
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) =>
                                        handleRemoveFile(item.id, e)
                                    }
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
