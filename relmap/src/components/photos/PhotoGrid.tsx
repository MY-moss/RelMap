import { useState } from 'react'
import type { Photo } from '../../shared/types'

interface PhotoGridProps {
  photos: Photo[]
  onPhotoClick?: (photo: Photo) => void
  selectionMode?: boolean
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  onBatchDelete?: () => void
}

// 将本地文件路径转换为 file:// 协议 URL（兼容 Windows 反斜杠）
function photoSrc(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  return `file:///${normalized.replace(/^\//, '')}`
}

function PhotoPlaceholder() {
  return (
    <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    </div>
  )
}

export default function PhotoGrid({ photos, onPhotoClick, selectionMode, selectedIds, onSelectionChange, onBatchDelete }: PhotoGridProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (photos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <p>还没有照片</p>
      </div>
    )
  }

  const hasSelection = selectedIds && selectedIds.size > 0

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange?.(next)
  }

  const clearSelection = () => {
    onSelectionChange?.(new Set())
  }

  const handleBatchDelete = () => {
    setConfirmDelete(true)
  }

  return (
    <div>
      <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
        {photos.map((photo) => (
          <PhotoItem
            key={photo.id}
            photo={photo}
            selected={selectionMode ? selectedIds?.has(photo.id) ?? false : false}
            selectionMode={selectionMode ?? false}
            onSelect={toggleSelect}
            onPhotoClick={onPhotoClick}
          />
        ))}
      </div>

      {selectionMode && hasSelection && (
        <div className="fixed bottom-0 left-16 right-0 bg-white border-t border-gray-200 p-4 flex items-center justify-between shadow-lg z-50">
          <span className="text-sm text-gray-600">已选择 {selectedIds!.size} 张照片</span>
          <div className="flex gap-3">
            <button
              onClick={clearSelection}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消选择
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              批量删除
            </button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除选中的 {selectedIds!.size} 张照片吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false)
                  onBatchDelete?.()
                }}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoItem({ photo, onPhotoClick, selected, selectionMode, onSelect }: { photo: Photo; onPhotoClick?: (photo: Photo) => void; selected: boolean; selectionMode: boolean; onSelect: (id: string) => void }) {
  // 图片加载失败时显示占位图，但仍保留选择/点击等交互能力（便于用户清理坏图）
  const [failed, setFailed] = useState(false)

  return (
    <div
      onClick={() => {
        if (selectionMode) {
          onSelect(photo.id)
        } else {
          onPhotoClick?.(photo)
        }
      }}
      className={`break-inside-avoid mb-4 relative group rounded-lg overflow-hidden ${
        selectionMode || onPhotoClick ? 'cursor-pointer' : ''
      } ${selected ? 'ring-2 ring-primary-500' : ''}`}
    >
      {selectionMode && (
        <div
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'bg-primary-500 border-primary-500'
              : 'bg-white/80 border-gray-400'
          }`}
        >
          {selected && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </div>
      )}
      {failed ? (
        <PhotoPlaceholder />
      ) : (
        <img
          src={photoSrc(photo.file_path)}
          alt={photo.description ?? ''}
          loading="lazy"
          onError={() => setFailed(true)}
          className="w-full h-auto rounded-lg"
        />
      )}
      {photo.description && !selectionMode && (
        <div className="absolute inset-0 bg-black/50 text-white p-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-end pointer-events-none">
          <p className="line-clamp-3">{photo.description}</p>
        </div>
      )}
    </div>
  )
}
