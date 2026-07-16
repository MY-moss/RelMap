import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import type { SocialAccount, Relationship } from '../shared/types'
import CreatePersonModal from '../components/persons/CreatePersonModal'
import RelationEditor from '../components/relations/RelationEditor'
import IntimacySlider from '../components/relations/IntimacySlider'
import EventEditor from '../components/events/EventEditor'
import EventCard from '../components/events/EventCard'
import DiaryEditor from '../components/diaries/DiaryEditor'
import DiaryCard from '../components/diaries/DiaryCard'
import PhotoGrid from '../components/photos/PhotoGrid'
import PhotoImportDialog from '../components/photos/PhotoImportDialog'
import InteractionLogger from '../components/interactions/InteractionLogger'
import IntimacyTrend from '../components/relations/IntimacyTrend'
import { useTranslation } from 'react-i18next'
import { useToastContext } from '../components/common/ToastContext'
import SocialAccountEditor from '../components/social/SocialAccountEditor'
import { usePerson, usePersonRelations, useEventList, useDiaryList, usePersonPhotos, useDeleteRelation, useDeleteEvent, useDeleteDiary, useToggleFavorite, useUploadAvatar, useSetMainIdentity, useMainPerson, useDeletePerson, useTagList, useTagsByTarget, useApplyTag, useRemoveTag } from '../hooks'
import { personKeys, relationKeys, eventKeys, diaryKeys, socialKeys, photoKeys } from '../hooks/queryKeys'

interface RelationWithName {
  id: string;
  person_id: string;
  related_person_id: string;
  related_person_name: string;
  intimacy: number;
  intimacy_auto?: number;
  meet_method?: string;
  meet_date?: string;
  meet_location?: string;
  relation_label?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

type TabKey = 'info' | 'social' | 'relations' | 'events' | 'diaries' | 'photos' | 'interactions' | 'intimacy'

const tabKeys: { key: TabKey; tKey: string }[] = [
  { key: 'info', tKey: 'info_tab' },
  { key: 'social', tKey: 'social_tab' },
  { key: 'relations', tKey: 'relations_tab' },
  { key: 'events', tKey: 'events_tab' },
  { key: 'diaries', tKey: 'diaries_tab' },
  { key: 'photos', tKey: 'photos_tab' },
  { key: 'interactions', tKey: 'interactions_tab' },
  { key: 'intimacy', tKey: 'intimacy_tab' },
]

const genderText: Record<number, string> = { 0: 'person.gender_unknown', 1: 'person.male', 2: 'person.female' }

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToastContext()
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState<TabKey>('info')

  // 所有 hooks 必须在任何条件返回之前调用，确保 hooks 调用顺序一致
  // 当 id 为空时，相关查询通过 enabled 选项自动跳过
  const { data: person, isLoading: loading, error } = usePerson(id ?? '')
  const { data: relations = [] } = usePersonRelations(id ?? '', activeTab === 'relations')
  const { data: events = [] } = useEventList(id ? { person_id: id } : undefined, activeTab === 'events')
  const { data: diaries = [] } = useDiaryList(id ? { person_id: id } : undefined, activeTab === 'diaries')
  const { data: photos = [] } = usePersonPhotos(id ?? '', activeTab === 'photos')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [relationModalOpen, setRelationModalOpen] = useState(false)
  const [editingRelation, setEditingRelation] = useState<Relationship | undefined>(undefined)
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [diaryModalOpen, setDiaryModalOpen] = useState(false)
  const [photoImportOpen, setPhotoImportOpen] = useState(false)
  const [socialModalOpen, setSocialModalOpen] = useState(false)
  const [editingSocial, setEditingSocial] = useState<SocialAccount | undefined>(undefined)

  const deleteRelation = useDeleteRelation()
  const deleteEvent = useDeleteEvent()
  const deleteDiary = useDeleteDiary()
  const toggleFavorite = useToggleFavorite()
  const uploadAvatar = useUploadAvatar()
  const setMainIdentity = useSetMainIdentity()
  const deletePerson = useDeletePerson()
  const { data: mainPerson } = useMainPerson()
  const { data: allTags = [] } = useTagList()
  const { data: personTags = [] } = useTagsByTarget(id ?? '', 'person')
  const applyTag = useApplyTag()
  const removeTag = useRemoveTag()

  const handleToggleTag = async (tagId: string, isApplied: boolean) => {
    if (!id) return
    try {
      if (isApplied) {
        await removeTag.mutateAsync({ tagId, targetId: id, targetType: 'person' })
      } else {
        await applyTag.mutateAsync({ tagId, targetId: id, targetType: 'person' })
      }
    } catch {
      toast.showError('标签操作失败')
    }
  }

  // 头像上传相关状态
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarError, setAvatarError] = useState(false)

  // 头像路径变化时重置错误状态（如上传新头像后）
  useEffect(() => {
    setAvatarError(false)
  }, [person?.avatar_path])

  // 路由参数 id 为空时重定向到列表页（在 useEffect 中执行，避免渲染期间的副作用）
  useEffect(() => {
    if (!id) {
      navigate('/persons', { replace: true })
    }
  }, [id, navigate])

  const handleToggleFavorite = async () => {
    if (!person) return
    await toggleFavorite.mutateAsync(person.id)
  }

  const handleDeleteRelation = async (relationId: string) => {
    if (!confirm(t('person.relation_delete_confirm'))) return
    try {
      await deleteRelation.mutateAsync(relationId)
    } catch {
      toast.showError(t('person.delete_relation_fail'))
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm(t('person.event_delete_confirm'))) return
    try {
      await deleteEvent.mutateAsync(eventId)
    } catch {
      toast.showError(t('person.delete_event_fail'))
    }
  }

  const handleDeleteDiary = async (diaryId: string) => {
    if (!confirm(t('person.diary_delete_confirm'))) return
    try {
      await deleteDiary.mutateAsync(diaryId)
    } catch {
      toast.showError(t('person.delete_diary_fail'))
    }
  }

  const handleDeleteSocial = async (socialId: string) => {
    if (!confirm(t('person.social_delete_confirm'))) return
    try {
      await window.electronAPI.social.delete(socialId)
    } catch {
      toast.showError(t('person.delete_social_fail'))
    }
  }

  const handleOpenSocialEditor = (social?: SocialAccount) => {
    setEditingSocial(social)
    setSocialModalOpen(true)
  }

  // 点击头像触发文件选择
  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  // 选择文件后读取为 base64 并上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !person) return
    const reader = new FileReader()
    reader.onload = async () => {
      const base64Data = reader.result as string
      try {
        await uploadAvatar.mutateAsync({ personId: person.id, base64Data })
        setAvatarError(false)
        toast.showSuccess(t('person.avatar_upload_success'))
      } catch {
        toast.showError(t('person.avatar_upload_fail'))
      }
    }
    reader.onerror = () => {
      toast.showError(t('person.file_read_fail'))
    }
    reader.readAsDataURL(file)
    // 重置 input value，允许重复选择同一文件
    e.target.value = ''
  }

  // 路由参数 id 为空：不卡在加载状态，直接给出明确提示（重定向由 useEffect 处理）
  if (!id) {
    return (
      <div className="p-6 page-enter">
        <p className="text-red-500">{t('person.missing_id')}</p>
        <button
          onClick={() => navigate('/persons')}
          className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
        >
          {t('common.return_to_list')}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 page-enter">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  // API 请求失败（如 id 无效、404 等）：显示具体错误，而非笼统的"未找到"
  if (error) {
    return (
      <div className="p-6 page-enter">
        <p className="text-red-500">{t('person.load_error', { message: (error as Error).message })}</p>
        <button
          onClick={() => navigate('/persons')}
          className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
        >
          {t('common.return_to_list')}
        </button>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="p-6 page-enter">
        <p className="text-gray-500">{t('person.not_found')}</p>
        <button
          onClick={() => navigate('/persons')}
          className="mt-4 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg"
        >
          {t('common.return_to_list')}
        </button>
      </div>
    )
  }

  const initial = person.name?.charAt(0)?.toUpperCase() || '?'
  const isFavorite = person.is_favorite

  const infoRows: { label: string; value: string }[] = [
    { label: t('person.name'), value: person.name },
    { label: t('person.nickname'), value: person.nickname || '-' },
    { label: t('person.birthday'), value: person.birthday || '-' },
    { label: t('person.gender'), value: t(genderText[person.gender]) || t('person.gender_unknown') },
    { label: t('person.company'), value: person.company || '-' },
    { label: t('person.title'), value: person.title || '-' },
    { label: t('person.department'), value: person.department || '-' },
    { label: '🏠 ' + t('person.home_address'), value: person.home_address || '-' },
    { label: t('person.notes'), value: person.notes || '-' },
  ]

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/persons')}
          className="flex items-center gap-1 text-gray-600 hover:text-primary-500 transition-colors"
          title={t('common.back')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>{t('common.back')}</span>
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        {/* 头像：点击上传，有图片则显示，加载失败 fallback 到首字母 */}
        <div className="relative">
          <div
            onClick={handleAvatarClick}
            className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            title={t('person.upload_avatar')}
          >
            {person.avatar_path && !avatarError ? (
              <img
                src={`file:///${person.avatar_path.replace(/\\/g, '/').replace(/^\//, '')}`}
                alt={person.name}
                className="w-full h-full object-cover"
                onError={() => setAvatarError(true)}
              />
            ) : (
              initial
            )}
          </div>
          {/* 上传中遮罩 */}
          {uploadAvatar.isPending && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <span className="text-white text-xs">{t('common.uploading')}</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            {person.name}
            {person.is_main_identity && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium align-middle">
                {t('person.main_identity_badge')}
              </span>
            )}
          </h1>
          {person.nickname && <p className="text-gray-500 mt-1">{person.nickname}</p>}
        </div>
        <button
          onClick={handleToggleFavorite}
          className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors ${
            isFavorite
              ? 'border-primary-300 bg-primary-50 text-primary-500'
              : 'border-gray-300 text-gray-400 hover:text-primary-500'
          }`}
          title={isFavorite ? t('common.unfavorite') : t('common.favorite')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </button>
        {!person.is_main_identity && (
          <button
            onClick={async () => {
              try {
                await setMainIdentity.mutateAsync(person.id)
                toast.showSuccess(t('person.set_main_success'))
              } catch {
                toast.showError(t('person.set_main_fail'))
              }
            }}
            className="text-xs text-amber-600 hover:text-amber-800 border border-amber-200 hover:border-amber-400 px-2 py-1 rounded transition-colors"
            disabled={setMainIdentity.isPending}
          >
            {t('common.set_as_main_identity')}
          </button>
        )}
        <button
          onClick={() => setEditModalOpen(true)}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
        >
          {t('common.edit')}
        </button>
        <button
          onClick={async () => {
            if (!confirm(t('person.delete_confirm', { name: person.name }))) return
            try {
              await deletePerson.mutateAsync(person.id)
              toast.showSuccess(t('person.delete_success', { name: person.name }))
              navigate('/persons', { replace: true })
            } catch {
              toast.showError(t('person.delete_person_fail'))
            }
          }}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          {t('common.delete')}
        </button>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabKeys.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t(`person.${tab.tKey}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {activeTab === 'info' && (
          <div>
            {/* Main identity relationship overview */}
            {person.is_main_identity && relations.length > 0 && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <h4 className="text-sm font-semibold text-amber-800 mb-3">{t('person.relation_overview')}</h4>
                <div className="flex gap-4 mb-3 text-sm">
                  <div><span className="text-amber-700 font-bold">{relations.length}</span> <span className="text-amber-600">{t('person.relation_count')}</span></div>
                  <div><span className="text-amber-700 font-bold">{Math.round(relations.reduce((s, r) => s + r.intimacy, 0) / relations.length)}</span> <span className="text-amber-600">{t('person.avg_intimacy_label')}</span></div>
                  <div><span className="text-amber-700 font-bold">{relations.filter(r => r.intimacy >= 70).length}</span> <span className="text-amber-600">{t('person.close_friends')}</span></div>
                  <div><span className="text-amber-700 font-bold">{relations.filter(r => r.intimacy < 30).length}</span> <span className="text-amber-600">{t('person.needs_maintenance')}</span></div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {relations.slice(0, 10).map(rel => (
                    <span
                      key={rel.id}
                      onClick={() => navigate(`/persons/${rel.related_person_id}`)}
                      className="text-xs px-2 py-1 bg-white border border-amber-200 text-amber-700 rounded-full cursor-pointer hover:bg-amber-100 transition-colors"
                    >
                      {rel.related_person_name}
                    </span>
                  ))}
                  {relations.length > 10 && (
                    <span className="text-xs text-amber-400 self-center">+{relations.length - 10}</span>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {infoRows.map((row) => (
                <div key={row.label} className="flex">
                  <span className="w-20 flex-shrink-0 text-sm text-gray-500">{row.label}</span>
                  <span className="text-sm text-gray-800 whitespace-pre-wrap break-words">{row.value}</span>
                </div>
              ))}
            </div>

            {/* 标签分配 */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">标签</span>
                <span className="text-xs text-gray-400">（点击标签切换分配）</span>
              </div>
              {allTags.length === 0 ? (
                <p className="text-xs text-gray-400">暂无标签，请前往设置创建</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const isApplied = personTags.some((t) => t.id === tag.id)
                    return (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id, isApplied)}
                        disabled={applyTag.isPending || removeTag.isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isApplied
                            ? 'border-transparent text-white shadow-sm'
                            : 'border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                        }`}
                        style={isApplied ? { backgroundColor: tag.color } : {}}
                      >
                        {isApplied ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'social' && (
          <SocialTabContent personId={person.id} onDelete={handleDeleteSocial} onEdit={handleOpenSocialEditor} />
        )}

        {activeTab === 'relations' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{t('person.relations')}</h3>
              <button
                onClick={() => setRelationModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('person.add_relation')}
              </button>
            </div>
            {relations.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">{t('person.no_relations')}</p>
            ) : (
              <ul className="space-y-3">
                {(relations as RelationWithName[]).map((rel) => {
                  const isMainIdentityRelation = !person.is_main_identity && mainPerson && rel.related_person_id === mainPerson.id
                  return (
                    <li key={rel.id} className="border border-gray-100 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="font-medium text-primary-600 cursor-pointer hover:underline"
                              onClick={() => navigate(`/persons/${rel.related_person_id}`)}
                            >
                              {rel.related_person_name}
                            </span>
                            {rel.relation_label && (
                              <span className="text-sm text-gray-500">
                                {isMainIdentityRelation ? t('person.relation_to_me', { label: rel.relation_label }) : rel.relation_label}
                              </span>
                            )}
                          </div>
                          {person.is_main_identity && (
                            <p className="text-xs text-gray-400 mt-0.5">{t('person.binder_label', { name: rel.related_person_name })}</p>
                          )}
                          {isMainIdentityRelation && (
                            <p className="text-xs text-amber-600 mt-0.5">{t('person.main_identity_person')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingRelation(rel as unknown as Relationship); setRelationModalOpen(true) }}
                            className="text-sm text-primary-500 hover:text-primary-700"
                          >
                            {t('person.edit_relation')}
                          </button>
                          <button
                            onClick={() => handleDeleteRelation(rel.id)}
                            className="text-sm text-red-500 hover:text-red-700"
                          >
                            {t('person.delete_relation')}
                          </button>
                        </div>
                      </div>
                      <IntimacySlider value={rel.intimacy} readOnly />
                      {rel.meet_method && (
                        <p className="text-sm text-gray-500 mt-1">{t('person.met_method', { method: rel.meet_method })}</p>
                      )}
                      {rel.meet_date && (
                        <p className="text-sm text-gray-500">{t('person.met_date', { date: rel.meet_date })}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{t('person.events')}</h3>
              <button
                onClick={() => setEventModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('person.add_event')}
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">{t('person.no_events')}</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="relative group">
                    <EventCard event={event} />
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="absolute top-2 right-2 text-sm text-red-500 hover:text-red-700 bg-white/80 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {t('person.edit_event')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'diaries' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{t('person.diaries')}</h3>
              <button
                onClick={() => setDiaryModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('person.add_diary')}
              </button>
            </div>
            {diaries.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">{t('person.no_diaries')}</p>
            ) : (
              <div className="space-y-3">
                {diaries.map((diary) => (
                  <div key={diary.id} className="relative group">
                    <DiaryCard diary={diary} />
                    <button
                      onClick={() => handleDeleteDiary(diary.id)}
                      className="absolute top-2 right-2 text-sm text-red-500 hover:text-red-700 bg-white/80 rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {t('person.edit_event')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">{t('person.photos')}</h3>
              <button
                onClick={() => setPhotoImportOpen(true)}
                className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                {t('person.import_photos')}
              </button>
            </div>
            <PhotoGrid photos={photos} />
          </div>
        )}

        {activeTab === 'interactions' && (
          <InteractionLogger personId={person.id} />
        )}

        {activeTab === 'intimacy' && (
          <IntimacyTrend personId={person.id} />
        )}
      </div>

      <CreatePersonModal
        open={editModalOpen}
        person={person}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: personKeys.detail(person.id) })
          queryClient.invalidateQueries({ queryKey: personKeys.lists() })
        }}
      />
      <RelationEditor
        open={relationModalOpen}
        personId={person.id}
        relation={editingRelation}
        onClose={() => { setRelationModalOpen(false); setEditingRelation(undefined) }}
        onSaved={() => {
          setRelationModalOpen(false); setEditingRelation(undefined)
          queryClient.invalidateQueries({ queryKey: relationKeys.all })
          queryClient.invalidateQueries({ queryKey: personKeys.detail(person.id) })
        }}
      />
      <EventEditor
        open={eventModalOpen}
        personId={person.id}
        onClose={() => setEventModalOpen(false)}
        onSaved={() => {
          setEventModalOpen(false)
          queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
        }}
      />
      <DiaryEditor
        open={diaryModalOpen}
        personId={person.id}
        onClose={() => setDiaryModalOpen(false)}
        onSaved={() => {
          setDiaryModalOpen(false)
          queryClient.invalidateQueries({ queryKey: diaryKeys.lists() })
        }}
      />
      <PhotoImportDialog
        open={photoImportOpen}
        personId={person.id}
        onClose={() => setPhotoImportOpen(false)}
        onImported={() => {
          setPhotoImportOpen(false)
          queryClient.invalidateQueries({ queryKey: photoKeys.all })
        }}
      />
      <SocialAccountEditor
        open={socialModalOpen}
        personId={person.id}
        social={editingSocial}
        onClose={() => {
          setSocialModalOpen(false)
          setEditingSocial(undefined)
        }}
        onSaved={() => {
          setSocialModalOpen(false); setEditingSocial(undefined)
          queryClient.invalidateQueries({ queryKey: socialKeys.all })
        }}
      />
    </div>
  )
}

function SocialTabContent({ personId, onDelete, onEdit }: { personId: string; onDelete: (id: string) => void; onEdit: (social?: SocialAccount) => void }) {
  const { t } = useTranslation()
  const [socials, setSocials] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    window.electronAPI.social.listByPerson(personId).then((result) => {
      if (cancelled) return
      if (result.success) setSocials(result.data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [personId])

  if (loading) return <p className="text-gray-500 text-sm py-8 text-center">{t('common.loading')}</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">{t('person.social_accounts')}</h3>
        <button
          className="px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          onClick={() => onEdit()}
        >
          {t('person.add_social')}
        </button>
      </div>
      {socials.length === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">{t('person.no_social_accounts')}</p>
      ) : (
        <ul className="space-y-2">
          {socials.map((s) => (
            <li key={s.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">{s.platform}</span>
                  {s.is_primary === 1 && (
                    <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded">{t('person.primary_account')}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {s.account_name ? `${s.account_name} · ` : ''}{s.account_id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(s)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  {t('common.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
