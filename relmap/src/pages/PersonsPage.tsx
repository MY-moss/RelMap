import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { PersonFilter } from '../shared/types'
import PersonCard from '../components/persons/PersonCard'
import CreatePersonModal from '../components/persons/CreatePersonModal'
import BatchTagModal from '../components/tags/BatchTagModal'
import BatchGroupModal from '../components/groups/BatchGroupModal'
import AIImportWizard from '../components/ai/AIImportWizard'
import EmptyState from '../components/common/EmptyState'
import { usePersonList, useToggleFavorite, useMainPerson, useTagList } from '../hooks'
import { personKeys } from '../hooks/queryKeys'


type SortBy = 'name' | 'created_at'

export default function PersonsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [onlyFavorite, setOnlyFavorite] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [selectedTagId, setSelectedTagId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [aiImportOpen, setAiImportOpen] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastClickedIndex = useRef(-1)
  const [batchTagOpen, setBatchTagOpen] = useState(false)
  const [batchGroupOpen, setBatchGroupOpen] = useState(false)
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)

  const { data: mainPerson } = useMainPerson()
  const { data: tags = [] } = useTagList()

  const filter: PersonFilter = {
    sort_by: sortBy,
    sort_order: 'asc',
  }
  if (debouncedKeyword.trim()) filter.keyword = debouncedKeyword.trim()
  if (onlyFavorite) filter.is_favorite = true
  if (selectedTagId) filter.tag_id = selectedTagId

  const { data: persons = [], isLoading: loading } = usePersonList(filter)

  const toggleFav = useToggleFavorite()

  useEffect(() => {
    setSelectedIds(new Set())
  }, [debouncedKeyword, onlyFavorite, selectedTagId, sortBy])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300)
    return () => clearTimeout(timer)
  }, [keyword])

  const handleClickPerson = (id: string) => {
    navigate(`/persons/${id}`)
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      await toggleFav.mutateAsync(id)
    } catch (err) {
      console.error('切换收藏失败:', err)
    }
  }

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: personKeys.lists() })
  }

  const handleToggleSelect = (id: string, index: number, shiftKey: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (shiftKey && lastClickedIndex.current !== -1) {
        const start = Math.min(lastClickedIndex.current, index)
        const end = Math.max(lastClickedIndex.current, index)
        for (let i = start; i <= end; i++) {
          if (persons[i]) next.add(persons[i].id)
        }
      } else {
        if (next.has(id)) next.delete(id)
        else next.add(id)
      }
      lastClickedIndex.current = index
      return next
    })
  }

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === persons.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(persons.map((p) => p.id)))
    }
  }, [selectedIds.size, persons])

  const handleBatchDelete = async () => {
    setBatchDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const r = await window.electronAPI.person.batchDelete(ids)
      if (!r.success) throw new Error(r.error)
      queryClient.invalidateQueries({ queryKey: personKeys.lists() })
      setSelectedIds(new Set())
      setBatchDeleteConfirm(false)
      alert(`已删除 ${r.data.deleted} 人`)
    } catch (e) {
      console.error('batch delete failed:', e)
      alert('批量删除失败: ' + (e as Error).message)
    } finally {
      setBatchDeleting(false)
    }
  }

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('person.list_title')}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAiImportOpen(true)}
            className="px-4 py-2 bg-white border border-primary-300 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5h16.5M3.75 9h16.5m-16.5 4.5h16.5M5.25 19.5h13.5" />
            </svg>
            <span>{t('person.ai_import')}</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>{t('person.create_new')}</span>
          </button>
        </div>
      </div>

      {/* Main identity banner */}
      {mainPerson && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">👤</span>
          <div className="flex-1">
            <span className="text-sm font-medium text-amber-800">
              {t('person.main_identity_banner', { name: mainPerson.name })}
            </span>
            {mainPerson.company && (
              <span className="text-sm text-amber-600 ml-2">{mainPerson.company}</span>
            )}
          </div>
          <button
            onClick={() => navigate(`/persons/${mainPerson.id}`)}
            className="text-xs text-amber-700 hover:text-amber-900 underline"
          >
            {t('common.view')}
          </button>
        </div>
      )}

      <div className="card mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 p-4 pb-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={t('person.search_placeholder')}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-[var(--surface-muted)]"
            />
          </div>

          <button
            onClick={() => setOnlyFavorite((prev) => !prev)}
            className={`px-3 py-2 rounded-lg border transition-colors flex items-center gap-1 text-sm ${
              onlyFavorite
                ? 'border-primary-300 bg-primary-50 text-primary-600'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={onlyFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
            <span>{onlyFavorite ? t('person.favorites_only') : t('person.all')}</span>
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm text-gray-500 bg-[var(--surface-muted)]"
          >
            <option value="name">{t('person.sort_by_name')}</option>
            <option value="created_at">{t('person.sort_by_date')}</option>
          </select>

          {(keyword || onlyFavorite || selectedTagId) && (
            <button
              onClick={() => { setKeyword(''); setDebouncedKeyword(''); setOnlyFavorite(false); setSelectedTagId('') }}
              className="text-xs text-primary-500 hover:text-primary-700 hover:underline flex-shrink-0"
            >
              清除筛选
            </button>
          )}
        </div>

        {/* Tag chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 px-4 pb-4 pt-0">
            <span
              onClick={() => setSelectedTagId('')}
              className={`tag-chip ${!selectedTagId ? 'active' : ''}`}
              style={{ color: '#6b7280', backgroundColor: !selectedTagId ? '#f3f4f6' : 'transparent' }}
            >
              {t('person.all_tags')}
            </span>
            {tags.map((tag) => (
              <span
                key={tag.id}
                onClick={() => setSelectedTagId(selectedTagId === tag.id ? '' : tag.id)}
                className={`tag-chip ${selectedTagId === tag.id ? 'active' : ''}`}
                style={{
                  color: tag.color || '#6b7280',
                  backgroundColor: selectedTagId === tag.id
                    ? `${tag.color || '#6b7280'}18`
                    : `${tag.color || '#6b7280'}0a`,
                }}
              >
                <span className="tag-chip-dot" style={{ backgroundColor: tag.color || '#6b7280' }} />
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500">{t('common.loading')}</p>
      ) : persons.length === 0 ? (
        <EmptyState title={t('person.empty_title')} description={t('person.empty_description')} action={{ label: t('person.create'), onClick: () => setModalOpen(true) }} />
      ) : (
        <div>
          {/* Select all bar */}
          {persons.length > 5 && (
            <div className="flex items-center gap-2 mb-3 px-1">
              <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === persons.length && persons.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                {selectedIds.size > 0 ? `已选 ${selectedIds.size}/${persons.length}` : '全选'}
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {persons.map((person, index) => (
              <div key={person.id} className="relative">
                <div
                  className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                    selectedIds.has(person.id)
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/80 border border-gray-300 text-transparent hover:border-primary-400'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleSelect(person.id, index, e.shiftKey)
                  }}
                >
                  {selectedIds.has(person.id) && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </div>
                <PersonCard
                  person={person}
                  onClick={handleClickPerson}
                  onToggleFavorite={handleToggleFavorite}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch action toolbar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-white border border-gray-200 rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
            已选 {selectedIds.size} 人
          </span>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={() => setBatchTagOpen(true)}
            className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
          >
            批量标签
          </button>
          <button
            onClick={() => setBatchGroupOpen(true)}
            className="px-3 py-1.5 text-sm bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
          >
            加入群组
          </button>
          <button
            onClick={() => setBatchDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
          >
            批量删除
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            取消
          </button>
        </div>
      )}

      <BatchTagModal
        open={batchTagOpen}
        personIds={Array.from(selectedIds)}
        onClose={() => setBatchTagOpen(false)}
        onDone={handleSaved}
      />
      <BatchGroupModal
        open={batchGroupOpen}
        personIds={Array.from(selectedIds)}
        onClose={() => setBatchGroupOpen(false)}
        onDone={handleSaved}
      />

      {/* Batch delete confirm dialog */}
      {batchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => !batchDeleting && setBatchDeleteConfirm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认批量删除</h3>
            <p className="text-sm text-gray-600 mb-6">
              确定要删除选中的 {selectedIds.size} 位联系人吗？此操作不可撤销。
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setBatchDeleteConfirm(false)}
                disabled={batchDeleting}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-lg transition-colors"
              >
                {batchDeleting ? '删除中...' : `确认删除 ${selectedIds.size} 人`}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatePersonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
      <AIImportWizard
        open={aiImportOpen}
        onClose={() => setAiImportOpen(false)}
        onImported={handleSaved}
      />
    </div>
  )
}
