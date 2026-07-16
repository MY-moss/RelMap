import FollowUpQueue from '../components/follow_up/FollowUpQueue'

export default function FollowUpPage() {
  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">跟进队列</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">管理需要跟进的联系人任务</p>
        </div>
      </div>
      <FollowUpQueue />
    </div>
  )
}