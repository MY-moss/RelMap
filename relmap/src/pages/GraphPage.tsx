import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import cytoscape from 'cytoscape'
import type { GraphData, GraphNode, GraphEdge, NodeDetail, CommunityInfo } from '../shared/types'
import EmptyState from '../components/common/EmptyState'
import BridgeDetector from '../components/ai/BridgeDetector'
import PathFinder from '../components/ai/PathFinder'

function getIntimacyColor(intimacy: number): string {
  if (intimacy <= 20) return '#d1d5db'
  if (intimacy <= 40) return '#60a5fa'
  if (intimacy <= 60) return '#34d399'
  if (intimacy <= 80) return '#fb923c'
  return '#f87171'
}

function getNodeSize(intimacy: number): number {
  return 30 + (intimacy / 100) * 30
}

function getEdgeWidth(intimacy: number): number {
  return 1 + (intimacy / 100) * 5
}

const COMMUNITY_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16']

function buildElements(data: GraphData, communityMap?: Map<string, number>): cytoscape.ElementDefinition[] {
  const nodes: cytoscape.ElementDefinition[] = data.nodes.map((n: GraphNode) => ({
    data: {
      id: n.id,
      name: n.name,
      intimacy: n.intimacy,
      is_favorite: n.is_favorite,
      color: communityMap ? COMMUNITY_COLORS[(communityMap.get(n.id) ?? 0) % COMMUNITY_COLORS.length] : getIntimacyColor(n.intimacy),
      size: getNodeSize(n.intimacy),
      bw: n.is_favorite ? 3 : 0,
      communityId: communityMap?.get(n.id),
    },
  }))

  const edges: cytoscape.ElementDefinition[] = data.edges.map(
    (e: GraphEdge, i: number) => ({
      data: {
        id: `edge-${i}`,
        source: e.source,
        target: e.target,
        intimacy: e.intimacy,
        label: e.relation_label ?? '',
        color: getIntimacyColor(e.intimacy),
        width: getEdgeWidth(e.intimacy),
      },
    })
  )

  return [...nodes, ...edges]
}

const coseLayout = {
  name: 'cose',
  animate: true,
  animationDuration: 500,
  nodeRepulsion: 8000,
  idealEdgeLength: 100,
  edgeElasticity: 0.45,
  gravity: 0.25,
  numIter: 2500,
} as cytoscape.LayoutOptions

export default function GraphPage() {
  const navigate = useNavigate()

  const [data, setData] = useState<GraphData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [minIntimacy, setMinIntimacy] = useState(0)
  const [debouncedMinIntimacy, setDebouncedMinIntimacy] = useState(0)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [communityMode, setCommunityMode] = useState(false)
  const [communityData, setCommunityData] = useState<CommunityInfo[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [filterOpen, setFilterOpen] = useState(true)
  const [rightTab, setRightTab] = useState<'pathfinder' | 'bridge'>('pathfinder')
  const [personList, setPersonList] = useState<{ id: string; name: string }[]>([])

  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const selectedRef = useRef<string | null>(null)
  const requestIdRef = useRef(0)
  const communityReqRef = useRef(0)
  const detailReqRef = useRef(0)
  const mountedRef = useRef(true)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      wheelSensitivity: 0.3,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(name)',
            'text-valign': 'bottom',
            'text-margin-y': -6,
            'font-size': '12px',
            'font-family': 'Inter, PingFang SC, Microsoft YaHei, sans-serif',
            color: '#1f2937',
            'text-outline-color': '#ffffff',
            'text-outline-width': '3px',
            'background-color': 'data(color)',
            width: 'data(size)',
            height: 'data(size)',
            'border-width': 'data(bw)',
            'border-color': '#fbbf24',
          },
        },
        {
          selector: 'node.selected',
          style: {
            'border-width': 4,
            'border-color': '#FF9F43',
          },
        },
        {
          selector: 'node.search-highlight',
          style: {
            'border-width': 4,
            'border-color': '#3b82f6',
          },
        },
        {
          selector: 'node.search-dim',
          style: {
            opacity: 0.2,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': 'data(color)',
            'target-arrow-color': 'data(color)',
            'curve-style': 'bezier',
            label: 'data(label)',
            'font-size': '10px',
            color: '#6b7280',
            'text-rotation': 'autorotate',
            'text-background-color': '#ffffff',
            'text-background-opacity': 1,
            'text-background-padding': '2px',
            'text-background-shape': 'roundrectangle',
          },
        },
      ],
    })

    cy.on('tap', 'node', (evt) => {
      const node = evt.target
      const id = node.id()
      if (selectedRef.current === id) {
        navigate(`/persons/${id}`)
      } else {
        cy.elements().removeClass('selected')
        node.addClass('selected')
        selectedRef.current = id
        setSelectedNodeId(id)
      }
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        cy.elements().removeClass('selected')
        selectedRef.current = null
        setSelectedNodeId(null)
        setNodeDetail(null)
      }
    })

    cyRef.current = cy
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cy.destroy()
      cyRef.current = null
      selectedRef.current = null
    }
  }, [navigate])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy || !data || !mountedRef.current) return

    const communityMap = communityMode && communityData
      ? new Map<string, number>(
          communityData.flatMap(c => c.memberIds.map(id => [id, c.communityId] as [string, number]))
        )
      : undefined

    cy.json({ elements: buildElements(data, communityMap) })
    selectedRef.current = null
    cy.layout(coseLayout).run()
  }, [data, communityMode, communityData])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedMinIntimacy(minIntimacy), 300)
    return () => clearTimeout(timer)
  }, [minIntimacy])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const currentId = ++requestIdRef.current
    window.electronAPI.relation.getGraphData(debouncedMinIntimacy).then(result => {
      if (requestIdRef.current !== currentId) return
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
  }, [debouncedMinIntimacy])

  useEffect(() => {
    if (communityMode && !communityData && mountedRef.current) {
      const currentId = ++communityReqRef.current
      window.electronAPI.graph_enhanced.getCommunities().then(r => {
        if (communityReqRef.current !== currentId || !mountedRef.current) return
        if (r.success) setCommunityData(r.data)
      })
    }
  }, [communityMode, communityData])

  useEffect(() => {
    if (!selectedNodeId) {
      setNodeDetail(null)
      return
    }
    if (!mountedRef.current) return
    const currentId = ++detailReqRef.current
    setDetailLoading(true)
    window.electronAPI.graph_enhanced.getNodeDetails(selectedNodeId).then(r => {
      if (detailReqRef.current !== currentId || !mountedRef.current) return
      if (r.success) setNodeDetail(r.data)
      setDetailLoading(false)
    })
  }, [selectedNodeId])

  useEffect(() => {
    if (data && data.nodes.length > 0) {
      setPersonList(data.nodes.map(n => ({ id: n.id, name: n.name })))
    }
  }, [data])

  const handleHighlightPath = useCallback((personIds: string[]) => {
    const cy = cyRef.current
    if (!cy) return
    cy.nodes().forEach(node => {
      if (personIds.includes(node.id())) {
        node.removeClass('search-dim')
        node.addClass('search-highlight')
      } else {
        node.removeClass('search-highlight')
        node.addClass('search-dim')
      }
    })
    cy.edges().forEach(edge => {
      const src = edge.data('source')
      const tgt = edge.data('target')
      if (personIds.includes(src) && personIds.includes(tgt)) {
        edge.removeClass('search-dim')
      } else {
        edge.addClass('search-dim')
      }
    })
  }, [])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    if (!searchQuery.trim()) {
      cy.elements().removeClass('search-highlight search-dim')
      return
    }
    const q = searchQuery.toLowerCase()
    const matched = new Set<string>()
    cy.nodes().forEach(node => {
      const name = (node.data('name') as string || '').toLowerCase()
      if (name.includes(q)) {
        matched.add(node.id())
      }
    })
    setMatchedIds(matched)
    cy.nodes().forEach(node => {
      if (matched.has(node.id())) {
        node.removeClass('search-dim')
        node.addClass('search-highlight')
      } else {
        node.removeClass('search-highlight')
        node.addClass('search-dim')
      }
    })
    cy.edges().forEach(edge => {
      const src = edge.data('source')
      const tgt = edge.data('target')
      if (matched.has(src) && matched.has(tgt)) {
        edge.removeClass('search-dim')
      } else {
        edge.addClass('search-dim')
      }
    })
  }, [searchQuery])

  const handleRelayout = () => {
    cyRef.current?.layout(coseLayout).run()
  }

  const handleZoomIn = () => {
    const cy = cyRef.current
    if (!cy) return
    cy.zoom({ level: cy.zoom() * 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }

  const handleZoomOut = () => {
    const cy = cyRef.current
    if (!cy) return
    cy.zoom({ level: cy.zoom() / 1.3, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } })
  }

  const handleZoomReset = () => {
    const cy = cyRef.current
    if (!cy) return
    cy.zoom(1)
    cy.center()
  }

  const handleToggleCommunity = async () => {
    if (!communityMode) {
      const r = await window.electronAPI.graph_enhanced.getCommunities()
      if (r.success) setCommunityData(r.data)
    }
    setCommunityMode(!communityMode)
  }

  const handleExportPng = useCallback(async () => {
    const cy = cyRef.current
    if (!cy) return
    const dataUrl = cy.png({ full: true, scale: 2 })
    await window.electronAPI.graph_export.exportPng(dataUrl)
    setShowExportMenu(false)
  }, [])

  const handleExportJson = useCallback(async () => {
    const cy = cyRef.current
    if (!cy) return
    const elements = cy.elements().jsons()
    const exportData = { exportedAt: new Date().toISOString(), elements }
    await window.electronAPI.graph_export.exportJson(exportData)
    setShowExportMenu(false)
  }, [])

  const handleExportCsv = useCallback(async () => {
    if (!data) return
    const edges = data.edges.map(e => ({
      source: e.source,
      target: e.target,
      intimacy: e.intimacy,
      label: e.relation_label,
    }))
    await window.electronAPI.graph_export.exportCsv(edges)
    setShowExportMenu(false)
  }, [data])

  const handleShareSnapshot = useCallback(async () => {
    const cy = cyRef.current
    if (!cy) return
    const elements = cy.elements().jsons()
    const snapshot = { exportedAt: new Date().toISOString(), elements, graphData: data }
    await window.electronAPI.graph_export.shareSnapshot(snapshot)
    setShowExportMenu(false)
  }, [data])

  const hasData = !loading && data !== null && data.nodes.length > 0

  return (
    <div className="p-6 page-enter">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">关系图谱</h1>
        <p className="text-gray-500 text-sm mt-1">
          可视化联系人之间的关系网络，节点大小与颜色反映亲密度
        </p>
      </div>

      <div className="flex gap-4">
        <div
          className="relative bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1" style={{ height: 'var(--graph-container-height)' }}
        >
        <div ref={containerRef} className="absolute inset-0" />

        {loading && !data && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <svg
                className="animate-spin h-8 w-8 text-primary-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>加载中...</span>
            </div>
          </div>
        )}

        {!loading && error && !data && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="h-8 w-8 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
                />
              </svg>
              <p className="text-red-600 text-sm">图谱加载失败：{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && data !== null && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <EmptyState title="暂无关系数据" description="添加联系人和关系后可查看关系图谱" />
          </div>
        )}

        {hasData && (
          <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center justify-between gap-2 w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>控制面板</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4 transition-transform"
                style={{ transform: filterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {filterOpen && (
              <div className="p-3 w-60 space-y-3 border-t border-gray-100">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">
                    亲密度过滤
                  </label>
                  <span className="text-sm font-bold text-primary-600">
                    ≥ {minIntimacy}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minIntimacy}
                  onChange={(e) => setMinIntimacy(Number(e.target.value))}
                  className="w-full h-2 cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="搜索节点..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-primary-400"
                />
              </div>

              <button
                onClick={handleRelayout}
                className="w-full px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-md transition-colors flex items-center justify-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
                重新布局
              </button>

              <button
                onClick={handleToggleCommunity}
                className={`w-full px-3 py-1.5 text-sm rounded-md transition-colors flex items-center justify-center gap-1 border ${
                  communityMode
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
                按社区分组
              </button>

              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-sm rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  导出
                </button>
                {showExportMenu && (
                  <div className="absolute bottom-full mb-1 right-0 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20">
                    <button
                      onClick={handleExportPng}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      导出为 PNG
                    </button>
                    <button
                      onClick={handleExportJson}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      导出为 JSON
                    </button>
                    <button
                      onClick={handleExportCsv}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      导出为 CSV
                    </button>
                    <button
                      onClick={handleShareSnapshot}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    >
                      分享快照 (.relgraph)
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowLegend(!showLegend)}
                className={`w-full px-3 py-1.5 text-sm rounded-md transition-colors flex items-center justify-center gap-1 border ${
                  showLegend
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                  />
                </svg>
                图例
              </button>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                <span>节点 {data?.nodes.length ?? 0}</span>
                <span>关系 {data?.edges.length ?? 0}</span>
              </div>
              </div>
            )}
          </div>
        )}

        {hasData && searchQuery.trim() && matchedIds.size > 0 && (
          <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            找到 {matchedIds.size} 个匹配节点
          </div>
        )}

        {hasData && showLegend && (
          <div className="absolute bottom-3 right-3 z-10 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg p-3 w-56 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">图例</h4>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="关闭图例"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">节点颜色 — 亲密度</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f87171' }} />
                  <span className="text-xs text-gray-600">81-100 (紧密)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#fb923c' }} />
                  <span className="text-xs text-gray-600">61-80 (良好)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#34d399' }} />
                  <span className="text-xs text-gray-600">41-60 (一般)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#60a5fa' }} />
                  <span className="text-xs text-gray-600">21-40 (较少)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#d1d5db' }} />
                  <span className="text-xs text-gray-600">0-20 (疏远)</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">节点大小 — 亲密度</p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-600">小 = 低亲密度</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-gray-400" />
                <span className="text-xs text-gray-600">大 = 高亲密度</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">边宽度 — 关系强度</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-gray-400" />
                <span className="text-xs text-gray-600">细 = 低亲密度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1.5 bg-gray-400" />
                <span className="text-xs text-gray-600">粗 = 高亲密度</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 mb-1">星标 — 收藏联系人</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-amber-400 bg-gray-200" />
                <span className="text-xs text-gray-600">金色边框 = 收藏</span>
              </div>
            </div>
          </div>
        )}

        {hasData && selectedNodeId && (
          <div className="absolute top-3 left-3 z-10 w-72 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg max-h-[calc(100%-24px)] overflow-y-auto">
            <div className="flex items-center justify-between p-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">节点详情</h3>
              <button
                onClick={() => {
                  setSelectedNodeId(null)
                  setNodeDetail(null)
                  cyRef.current?.elements().removeClass('selected')
                  selectedRef.current = null
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {detailLoading ? (
              <div className="p-4 text-sm text-gray-500 text-center">加载中...</div>
            ) : nodeDetail ? (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
                    {nodeDetail.person.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{nodeDetail.person.name}</p>
                    {nodeDetail.person.nickname && (
                      <p className="text-xs text-gray-500 truncate">{nodeDetail.person.nickname}</p>
                    )}
                  </div>
                  {nodeDetail.communityId !== undefined && (
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COMMUNITY_COLORS[nodeDetail.communityId % COMMUNITY_COLORS.length] }}
                      title={`社区: ${nodeDetail.communityName ?? ''}`}
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">亲密度:</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${nodeDetail.intimacy}%`,
                        backgroundColor: getIntimacyColor(nodeDetail.intimacy),
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium" style={{ color: getIntimacyColor(nodeDetail.intimacy) }}>
                    {nodeDetail.intimacy}
                  </span>
                </div>

                {nodeDetail.communityName && (
                  <div className="text-xs text-gray-500">
                    社区: <span className="font-medium text-gray-700">{nodeDetail.communityName}</span>
                  </div>
                )}

                {nodeDetail.person.home_address && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span>{nodeDetail.person.home_address}</span>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">关联联系人 ({nodeDetail.relationships.length})</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {nodeDetail.relationships.map((rel) => (
                      <div key={rel.personId} className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50">
                        <span
                          className="text-xs text-primary-600 cursor-pointer hover:underline truncate flex-1"
                          onClick={() => navigate(`/persons/${rel.personId}`)}
                        >
                          {rel.personName}
                        </span>
                        <div className="flex items-center gap-1 ml-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getIntimacyColor(rel.intimacy) }}
                          />
                          <span className="text-xs text-gray-500">{rel.intimacy}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => navigate(`/persons/${nodeDetail.person.id}`)}
                    className="flex-1 px-2 py-1.5 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors"
                  >
                    查看详情
                  </button>
                  <button
                    onClick={() => navigate(`/persons/${nodeDetail.person.id}?tab=relations`)}
                    className="flex-1 px-2 py-1.5 text-xs bg-white border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    添加关系
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm text-gray-500 text-center">无法加载节点详情</div>
            )}
          </div>
        )}

        {hasData && (
          <div className="absolute bottom-3 left-3 z-10 zoom-controls">
            <button onClick={handleZoomIn} className="zoom-btn" title="放大">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="zoom-divider" />
            <button onClick={handleZoomOut} className="zoom-btn" title="缩小">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>
            <div className="zoom-divider" />
            <button onClick={handleZoomReset} className="zoom-btn" title="重置缩放">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="w-72 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setRightTab('pathfinder')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                rightTab === 'pathfinder'
                  ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              路径查找
            </button>
            <button
              onClick={() => setRightTab('bridge')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                rightTab === 'bridge'
                  ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              桥接人
            </button>
          </div>
        </div>
        {rightTab === 'pathfinder' ? (
          <PathFinder persons={personList} onHighlightPath={handleHighlightPath} />
        ) : (
          <BridgeDetector />
        )}
      </div>
      </div>
    </div>
  )
}
