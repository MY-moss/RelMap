import { useEffect, useState } from 'react'
import PhotoGrid from '../components/photos/PhotoGrid'
import PhotoImportDialog from '../components/photos/PhotoImportDialog'
import EmptyState from '../components/common/EmptyState'
import type { Photo } from '../shared/types'

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [importOpen, setImportOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.photo.listAll()
      if (result.success) {
        setPhotos(result.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPhotos()
  }, [])

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds)
    const result = await window.electronAPI.photo.batchDelete(ids)
    if (result.success) {
      setSelectionMode(false)
      setSelectedIds(new Set())
      loadPhotos()
    }
  }

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          照片墙
          {!loading && photos.length > 0 && (
            <span className="ml-3 text-base font-normal text-gray-400">
              {photos.length} 张
            </span>
          )}
        </h1>
        <div className="flex gap-2">
          {photos.length > 0 && (
            <button
              onClick={() => {
                setSelectionMode(!selectionMode)
                setSelectedIds(new Set())
              }}
              className={`px-4 py-2 rounded-lg transition-colors border ${
                selectionMode
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {selectionMode ? '取消选择' : '选择'}
            </button>
          )}
          <button
            onClick={() => setImportOpen(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            + 导入照片
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <EmptyState title="暂无照片" description="导入照片后可查看照片墙" />
        </div>
      ) : (
        <PhotoGrid
          photos={photos}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onBatchDelete={handleBatchDelete}
        />
      )}

      <PhotoImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false)
          loadPhotos()
        }}
      />
    </div>
  )
}
