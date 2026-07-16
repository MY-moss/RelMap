// 帮助页面：展示应用功能介绍、快捷操作、数据安全提示与关于信息
// 纯展示页面，不调用任何 API

import { version } from '../../package.json'

const APP_VERSION = version

export default function HelpPage() {
  // 功能介绍列表
  const features = [
    {
      title: '联系人管理',
      desc: '创建、编辑、收藏联系人，支持 AI 名片扫描导入',
      iconColor: '#60a5fa',
      bgColor: '#DBEAFE',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      ),
    },
    {
      title: '关系图谱',
      desc: '可视化人际关系网络，亲密度颜色编码',
      iconColor: '#a78bfa',
      bgColor: '#EDE9FE',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
        />
      ),
    },
    {
      title: '事件记录',
      desc: '记录重要事件，关联多个联系人',
      iconColor: '#34d399',
      bgColor: '#D1FAE5',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
        />
      ),
    },
    {
      title: '日记功能',
      desc: 'Markdown 日记，关联联系人',
      iconColor: '#38bdf8',
      bgColor: '#E0F2FE',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      ),
    },
    {
      title: '照片管理',
      desc: '导入照片，人脸检测，关联联系人',
      iconColor: '#f472b6',
      bgColor: '#FCE7F3',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      ),
    },
    {
      title: '全文搜索',
      desc: 'FTS5 引擎，搜索联系人 / 事件 / 日记',
      iconColor: '#fbbf24',
      bgColor: '#FEF3C7',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      ),
    },
    {
      title: '群组标签',
      desc: '分类管理联系人',
      iconColor: '#2dd4bf',
      bgColor: '#CCFBF1',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
        />
      ),
    },
    {
      title: '亲密度评分',
      desc: '四维算法（频率 + 近度 + 深度 + 手动）',
      iconColor: '#f87171',
      bgColor: '#FEE2E2',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      ),
    },
    {
      title: '提醒系统',
      desc: '生日 / 纪念日提醒，断联检测',
      iconColor: '#fb923c',
      bgColor: '#FFEDD5',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006.753 9.75v.7c0 2.22-.886 4.225-2.322 5.672a23.848 23.848 0 005.454 1.31m6.423 0a24.255 24.255 0 01-6.423 0m6.423 0a3 3 0 11-6.423 0"
        />
      ),
    },
    {
      title: '数据备份',
      desc: '加密备份导出 / 导入，vCard / CSV / JSON 导入导出',
      iconColor: '#818cf8',
      bgColor: '#E0E7FF',
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
        />
      ),
    },
  ]

  // 快捷操作列表
  const shortcuts = [
    { label: '全局搜索', desc: '顶部搜索栏，支持 300ms 防抖' },
    { label: 'AI 名片导入', desc: '联系人页 → "AI 名片导入" 按钮' },
    { label: '关系图谱', desc: '侧边栏 → "关系图谱"' },
    { label: '时间线', desc: '侧边栏 → "时间线"' },
    { label: '设置', desc: '侧边栏 → "设置"（群组管理、标签管理、数据备份）' },
  ]

  // 数据安全提示
  const securityTips = [
    '数据存储在本地 SQLite 数据库',
    '支持加密备份，建议定期备份',
    '恢复操作会覆盖当前数据',
  ]

  return (
      <div className="p-6 page-enter">
      <h1 className="text-2xl font-bold text-gray-800">使用帮助</h1>

      {/* 功能介绍区域 */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">功能介绍</h2>
        <div className="grid grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start gap-3"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: feature.bgColor }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={feature.iconColor}
                  strokeWidth="2"
                  className="w-6 h-6"
                >
                  {feature.icon}
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-800">{feature.title}</h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 快捷操作说明 */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">快捷操作</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <ul className="space-y-3">
            {shortcuts.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <div className="flex-1">
                  <span className="font-medium text-gray-800">{item.label}：</span>
                  <span className="text-sm text-gray-500">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 数据安全提示 */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">数据安全</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <ul className="space-y-3">
            {securityTips.map((tip) => (
              <li key={tip} className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <span className="text-sm text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 关于信息 */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">关于</h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#FFF3E0' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FF9F43"
              strokeWidth="2"
              className="w-7 h-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <span className="text-sm text-gray-500">应用名称：</span>
              <span className="text-sm font-medium text-gray-800">RelMap - 关系图谱</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">版本：</span>
              <span className="text-sm font-medium text-gray-800">v{APP_VERSION}</span>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-gray-500">技术栈：</span>
              <span className="text-sm font-medium text-gray-800">
                Electron + React + TypeScript + SQLite
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
