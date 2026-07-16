import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'RelMap',
  description: '关系管理地图 - 智能联系人关系管理',
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: '开发', link: '/development/' },
    ],
    sidebar: {
      '/guide/': [
        { text: '简介', link: '/guide/' },
        { text: '快速开始', link: '/guide/getting-started' },
        { text: '联系人管理', link: '/guide/contacts' },
        { text: '关系图谱', link: '/guide/graph' },
        { text: 'AI 功能', link: '/guide/ai' },
        { text: '备份与导入导出', link: '/guide/backup' },
        { text: '安全设置', link: '/guide/security' },
      ],
      '/api/': [
        { text: 'IPC 接口', link: '/api/ipc' },
        { text: '数据库', link: '/api/database' },
        { text: '类型定义', link: '/api/types' },
        { text: 'Hooks', link: '/api/hooks' },
      ],
      '/development/': [
        { text: '架构概览', link: '/development/' },
        { text: '数据流', link: '/development/data-flow' },
        { text: 'AI 模块', link: '/development/ai-modules' },
        { text: '测试', link: '/development/testing' },
        { text: '贡献指南', link: '/development/contributing' },
      ],
    },
  },
})
