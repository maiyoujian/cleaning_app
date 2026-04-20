import { useEffect } from 'react'
import '@/App.css'
import { StepIndicator } from './components/StepIndicator'
import { UploadArea } from './components/UploadArea'

function App() {
    useEffect(() => {
        // Prevent default browser behavior for file drops outside the drop zone
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

    return (
        <main className="min-h-screen bg-slate-50/50 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
                <StepIndicator currentStep={1} />
                <UploadArea />
            </div>
        </main>
    )
}

export default App
