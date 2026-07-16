import { useEffect, useMemo, useState } from 'react'
import type { Photo } from '../../shared/types'

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  return (
    <div className="w-full h-full">
      {status !== 'error' && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={() => setStatus('success')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'error' && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-gray-400">无法预览</span>
        </div>
      )}
    </div>
  )
}

interface PhotoImportDialogProps {
  open: boolean
  personId?: string
  onClose: () => void
  onImported: () => void
}

// 允许的图片扩展名（与后端保持一致）
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']

interface DuplicateGroup {
  imported: Photo
  existing: Photo[]
}

export default function PhotoImportDialog({
  open,
  personId,
  onClose,
  onImported,
}: PhotoImportDialogProps) {
  const [tab, setTab] = useState<'import' | 'duplicates'>('import')
  const [pathsText, setPathsText] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [mergeIds, setMergeIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      setPathsText('')
      setError('')
      setTab('import')
      setDuplicates([])
      setMergeIds(new Set())
    }
  }, [open])

  // 根据输入的路径文本计算图片预览列表（最多前10张）
  const previewPaths = useMemo(() => {
    return pathsText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => {
        if (!p) return false
        const ext = p.slice(p.lastIndexOf('.')).toLowerCase()
        return ALLOWED_IMAGE_EXTS.includes(ext)
      })
      .slice(0, 10)
  }, [pathsText])

  if (!open) return null

  // 将本地路径转换为 file:// URL（兼容 Windows 反斜杠路径）
  const toFileUrl = (p: string) =>
    `file:///${p.replace(/\\/g, '/').replace(/^[\\/]+/, '')}`

  // 检测重复：比较新导入照片与已有照片的 taken_at 时间（1小时内视为重复候选）
  const detectDuplicates = async (importedPhotos: Photo[]) => {
    const api = window.electronAPI
    const allResult = await api.photo.listAll()
    if (!allResult.success) return

    const allPhotos = allResult.data
    const group: DuplicateGroup[] = []

    for (const newPhoto of importedPhotos) {
      if (!newPhoto.taken_at) continue
      const newDate = new Date(newPhoto.taken_at).getTime()
      if (isNaN(newDate)) continue

      const matches = allPhotos.filter((p) => {
        if (p.id === newPhoto.id || !p.taken_at) return false
        const existingDate = new Date(p.taken_at).getTime()
        return !isNaN(existingDate) && Math.abs(existingDate - newDate) < 3600000
      })

      if (matches.length > 0) {
        group.push({ imported: newPhoto, existing: matches })
      }
    }

    if (group.length > 0) {
      setDuplicates(group)
      setTab('duplicates')
    } else {
      onImported()
      onClose()
    }
  }

  const handleImport = async () => {
    const paths = pathsText
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)

    if (paths.length === 0) {
      setError('请输入至少一个文件路径')
      return
    }

    const invalidPaths = paths.filter((p) => {
      const ext = p.slice(p.lastIndexOf('.')).toLowerCase()
      return !ALLOWED_IMAGE_EXTS.includes(ext)
    })
    if (invalidPaths.length > 0) {
      setError(
        `不支持的图片格式，仅支持 ${ALLOWED_IMAGE_EXTS.join(' ')}。问题路径：${invalidPaths[0]}`
      )
      return
    }

    setImporting(true)
    setError('')
    try {
      const api = window.electronAPI
      const result = await api.photo.import(paths)
      if (!result.success) {
        setError(result.error)
        return
      }

      if (personId && result.data.length > 0) {
        const results = await Promise.allSettled(
          result.data.map((photo) =>
            api.photo.linkPerson(photo.id, [personId])
          )
        )
        const failedCount = results.filter((r) => r.status === 'rejected').length
        if (failedCount > 0) {
          const successCount = results.length - failedCount
          console.warn(
            `照片关联联系人部分失败：成功 ${successCount} 张，失败 ${failedCount} 张`
          )
          results.forEach((r, idx) => {
            if (r.status === 'rejected') {
              console.error(`照片 ${result.data[idx]?.id} 关联失败:`, r.reason)
            }
          })
          onImported()
          setError(
            `照片已导入，其中 ${successCount} 张已关联到联系人，${failedCount} 张关联失败，请稍后手动关联。`
          )
          setPathsText('')
          return
        }
      }

      setPathsText('')
      // 自动检测重复
      await detectDuplicates(result.data)
    } catch (e) {
      setError(String(e))
    } finally {
      setImporting(false)
    }
  }

  const toggleMerge = (id: string) => {
    const next = new Set(mergeIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setMergeIds(next)
  }

  const handleMergeDelete = async () => {
    if (mergeIds.size === 0) {
      onImported()
      onClose()
      return
    }
    const api = window.electronAPI
    const ids = Array.from(mergeIds)
    await api.photo.batchDelete(ids)
    onImported()
    onClose()
  }

  if (tab === 'duplicates') {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4">重复检测</h2>
          <p className="text-sm text-gray-500 mb-4">
            发现 {duplicates.length} 组可能存在重复的照片（相同拍摄时间附近）。请选择要删除的重复项：
          </p>

          <div className="flex-1 overflow-y-auto space-y-4">
            {duplicates.map((group, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  新导入 — {group.imported.file_path.split(/[/\\]/).pop()}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <ImagePreview
                      src={toFileUrl(group.imported.file_path)}
                      alt="新照片"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">可能重复的已有照片：</p>
                    {group.existing.map((ep) => (
                      <label
                        key={ep.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={mergeIds.has(ep.id)}
                          onChange={() => toggleMerge(ep.id)}
                          className="w-4 h-4 text-red-500 rounded"
                        />
                        <span className="text-xs text-gray-600 truncate">
                          {ep.file_path.split(/[/\\]/).pop()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-3 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                onImported()
                onClose()
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              跳过（保留全部）
            </button>
            <button
              type="button"
              onClick={handleMergeDelete}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              删除选中项（{mergeIds.size} 张）
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">导入照片</h2>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-2">
          请输入照片文件路径，每行一个：
        </p>
        <p className="text-xs text-gray-400 mb-2">
          支持格式：{ALLOWED_IMAGE_EXTS.join(' ')}，单个文件不超过 50MB
        </p>
        <textarea
          value={pathsText}
          onChange={(e) => setPathsText(e.target.value)}
          rows={8}
          placeholder={'C:/photos/1.jpg\nC:/photos/2.png'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y font-mono text-sm"
        />

        {previewPaths.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">
              预览（共 {previewPaths.length} 张）：
            </p>
            <div className="grid grid-cols-5 gap-2">
              {previewPaths.map((p, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                >
                  <ImagePreview
                    src={toFileUrl(p)}
                    alt={p}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {personId && (
          <p className="text-xs text-gray-500 mt-2">
            导入后将自动关联到当前联系人
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {importing ? '导入中...' : '导入'}
          </button>
        </div>
      </div>
    </div>
  )
}
