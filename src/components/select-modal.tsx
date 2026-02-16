import { useState, useEffect } from 'react'

export function SelectModal({
  isOpen,
  onClose,
  title,
  values,
  onSelect,
  currentValue,
  inputMode = 'decimal',
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  values: number[]
  onSelect: (value: number) => void
  currentValue?: string
  inputMode?: 'decimal' | 'numeric'
}) {
  const [customValue, setCustomValue] = useState('')

  // Clear custom input when modal opens
  useEffect(() => {
    if (isOpen) {
      setCustomValue('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const current = currentValue ? parseFloat(currentValue) : null

  const handleCustomSubmit = () => {
    const val = parseFloat(customValue)
    if (Number.isFinite(val) && val > 0) {
      onSelect(val)
      setCustomValue('')
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Custom input */}
          <div className="pb-4 border-b border-gray-700">
            <label className="block text-sm text-gray-400 mb-2">Custom value:</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode={inputMode}
                placeholder="Enter value"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomSubmit()
                  }
                }}
                className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-500"
              />
              <button
                type="button"
                onClick={handleCustomSubmit}
                disabled={!customValue}
                className="px-4 py-3 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Set
              </button>
            </div>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-4 gap-2">
            {values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onSelect(value)
                  onClose()
                }}
                className={`p-3 rounded border text-center font-medium transition-colors ${
                  current === value
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
