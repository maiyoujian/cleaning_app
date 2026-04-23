import { useEffect, useMemo, useState, useRef } from 'react'
import '@/App.css'
import { SelectedFile } from './components/UploadArea'
import { WorkspaceLayout } from './components/layout/WorkspaceLayout'
import { RuleEditor } from './components/workspace/RuleEditor'
import { PreviewViewer } from './components/workspace/PreviewViewer'
import { invoke } from '@tauri-apps/api/core'
import {
    applyCleaningRules,
    createDefaultRules,
    parseSpreadsheetFile,
    type CleaningResult,
    type CleaningRules,
    type DataTable
} from '@/lib/cleaning'

function App() {
    const [currentStep, setCurrentStep] = useState(2)
    const [files, setFiles] = useState<SelectedFile[]>([])
    const [activeFileId, setActiveFileId] = useState<string | null>(null)
    const [table, setTable] = useState<DataTable | null>(null)
    const [parsingError, setParsingError] = useState<string | null>(null)
    const [rulesMap, setRulesMap] = useState<Record<string, CleaningRules>>({})
    const [result, setResult] = useState<CleaningResult | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // 当文件列表增加时，自动选中最新添加的文件
    const prevFilesLength = useRef(0)
    useEffect(() => {
        if (files.length > prevFilesLength.current) {
            const newlyAdded = files[files.length - 1]
            if (newlyAdded) {
                setActiveFileId(newlyAdded.id)
                // 如果处于预览界面，自动返回配置界面
                if (currentStep === 3) {
                    setCurrentStep(2)
                }
            }
        }
        prevFilesLength.current = files.length
    }, [files, currentStep])

    const activeRules = activeFileId ? (rulesMap[activeFileId] ?? createDefaultRules()) : createDefaultRules()

    const handleRulesChange = (newRules: CleaningRules) => {
        if (activeFileId) {
            setRulesMap(prev => ({ ...prev, [activeFileId]: newRules }))
        }
    }

    useEffect(() => {
        const preventDefault = (e: DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
        }
        window.addEventListener('dragenter', preventDefault, false)
        window.addEventListener('dragover', preventDefault, false)
        window.addEventListener('dragleave', preventDefault, false)
        window.addEventListener('drop', preventDefault, false)
        return () => {
            window.removeEventListener('dragenter', preventDefault)
            window.removeEventListener('dragover', preventDefault)
            window.removeEventListener('dragleave', preventDefault)
            window.removeEventListener('drop', preventDefault)
        }
    }, [])

    const successFiles = useMemo(
        () => files.filter((f) => f.status === 'success'),
        [files]
    )

    useEffect(() => {
        if (!activeFileId && successFiles.length > 0) {
            setActiveFileId(successFiles[0].id)
        }
    }, [activeFileId, successFiles])

    useEffect(() => {
        const parse = async () => {
            if (currentStep !== 2) return
            if (!activeFileId) return
            const active = files.find((f) => f.id === activeFileId)
            if (!active) return

            setParsingError(null)
            setTable(null)

            if (active.file.size === 0) {
                setParsingError(
                    '当前文件内容为空。若为桌面拖拽文件，请接入 Tauri 后端读取本地文件内容。'
                )
                return
            }

            try {
                const next = await parseSpreadsheetFile(active.file)
                if (next.columns.length === 0) {
                    setParsingError(
                        '未检测到表头或数据为空，请确认首行是表头。'
                    )
                    return
                }
                setTable(next)
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                setParsingError(msg)
            }
        }

        parse()
    }, [activeFileId, currentStep, files])

    const handleRun = async () => {
        if (!table) return
        
        const active = files.find((f) => f.id === activeFileId)
        if (!active) return

        setIsProcessing(true)
        try {
            // 尝试通过 Tauri IPC 调用 Rust -> Python 的最佳实践链路
            // 检查是否有真实路径（桌面端拖拽或通过 dialog 选择时应该有真实路径，这里假设存在 path 属性）
            // 在实际的 Tauri v2 开发中，通常使用 @tauri-apps/plugin-dialog 获取文件绝对路径
            // 但如果是在纯 Web 环境测试，或者拿不到绝对路径，则降级使用 TypeScript 版本的 mock 逻辑
            
            let resultData: CleaningResult | null = null
            let isTauriEnv = false
            
            try {
                // 探测是否在 Tauri 环境中
                isTauriEnv = !!(window as any).__TAURI_INTERNALS__
            } catch (e) {
                isTauriEnv = false
            }

            if (isTauriEnv && active.path) {
                try {
                    console.log('正在调用 Tauri Rust 后端与 Python...')
                    const rulesJson = JSON.stringify(activeRules)
                    const resultJson = await invoke<string>('run_python_cleaner', {
                        filePath: active.path,
                        rulesJson: rulesJson
                    })
                    resultData = JSON.parse(resultJson) as CleaningResult
                } catch (err) {
                    console.error('Python 后端执行失败，回退到前端 Mock 逻辑:', err)
                    // 后端执行失败，降级回退
                    resultData = applyCleaningRules(table, activeRules)
                }
            } else {
                console.log('未检测到 Tauri 环境或缺少文件绝对路径，使用前端 Mock 逻辑')
                resultData = applyCleaningRules(table, activeRules)
            }

            setResult(resultData)
            setCurrentStep(3)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRestart = () => {
        setCurrentStep(2)
        setFiles([])
        setActiveFileId(null)
        setTable(null)
        setResult(null)
        setParsingError(null)
        setRulesMap({})
    }

    return (
        <main className="h-screen w-screen overflow-hidden bg-slate-50/50 border-t border-gray-200">
            <div className="h-full w-full">
                <WorkspaceLayout
                    files={files}
                    setFiles={setFiles}
                    activeFileId={activeFileId}
                    onActiveFileIdChange={setActiveFileId}
                    columns={table?.columns ?? []}
                    table={table}
                    rules={activeRules}
                    previewResult={currentStep === 3 && result ? result : undefined}
                    onBackToRules={() => setCurrentStep(2)}
                >
                    {currentStep === 2 && (
                        <RuleEditor
                            files={files}
                            setFiles={setFiles}
                            columns={table?.columns ?? []}
                            rules={activeRules}
                            onChange={handleRulesChange}
                            parsingError={parsingError}
                            isProcessing={isProcessing}
                            onRun={handleRun}
                        />
                    )}
                    {currentStep === 3 && result && (
                        <PreviewViewer
                            activeFile={files.find(f => f.id === activeFileId) ?? null}
                            previewResult={result}
                            onBackToRules={() => setCurrentStep(2)}
                            onRestart={handleRestart}
                        />
                    )}
                </WorkspaceLayout>
            </div>
        </main>
    )
}

export default App
