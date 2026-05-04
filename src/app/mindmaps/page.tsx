'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth';
import { useRouter } from 'next/navigation';
import {
  Network,
  Plus,
  Trash2,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize,
  Share2,
  Sparkles,
  ChevronLeft,
  MoreVertical,
  X,
  Edit3,
  Layout,
  Grid,
} from 'lucide-react';

interface MindMapNode {
  id: string;
  concept: string;
  content?: string;
  node_type: 'root' | 'concept' | 'subconcept' | 'detail';
  x_position: number;
  y_position: number;
  color: string;
  collapsed?: boolean;
  mastery_level?: number;
}

interface MindMapEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label?: string;
  line_style: string;
  color: string;
}

interface MindMap {
  id: string;
  title: string;
  description?: string;
  topic?: string;
  layout_type: string;
  is_public: boolean;
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export default function MindMapsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [view, setView] = useState<'list' | 'editor'>('list');

  // New mind map form
  const [newMap, setNewMap] = useState({
    title: '',
    description: '',
    topic: '',
    layoutType: 'radial',
  });

  useEffect(() => {
    if (user?.id) {
      fetchMindMaps();
    }
  }, [user?.id]);

  const fetchMindMaps = async () => {
    try {
      const response = await fetch(`/api/mindmaps?userId=${user?.id}`);
      const data = await response.json();
      if (data.success) {
        setMindMaps(data.mindMaps || []);
      }
    } catch (error) {
      console.error('Error fetching mind maps:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMindMapDetails = async (mindMapId: string) => {
    try {
      const response = await fetch(`/api/mindmaps?userId=${user?.id}&mindMapId=${mindMapId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedMap(data.mindMap);
        setView('editor');
      }
    } catch (error) {
      console.error('Error fetching mind map details:', error);
    }
  };

  const handleCreateMindMap = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          title: newMap.title,
          description: newMap.description,
          topic: newMap.topic,
          layoutType: newMap.layoutType,
          nodes: [
            {
              concept: newMap.title,
              content: newMap.description,
              node_type: 'root',
              x_position: 400,
              y_position: 300,
              color: '#6366f1',
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateModal(false);
        setNewMap({ title: '', description: '', topic: '', layoutType: 'radial' });
        fetchMindMaps();
        if (data.mindMap?.id) {
          fetchMindMapDetails(data.mindMap.id);
        }
      }
    } catch (error) {
      console.error('Error creating mind map:', error);
    }
  };

  const handleGenerateFromFlashcards = async () => {
    try {
      const response = await fetch('/api/mindmaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        fetchMindMaps();
        if (data.mindMap?.id) {
          fetchMindMapDetails(data.mindMap.id);
        }
      }
    } catch (error) {
      console.error('Error generating mind map:', error);
    }
  };

  const handleDeleteMindMap = async (mindMapId: string) => {
    if (!confirm('Bạn có chắc muốn xóa mind map này?')) return;

    try {
      const response = await fetch(`/api/mindmaps?mindMapId=${mindMapId}&userId=${user?.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMindMaps();
        if (selectedMap?.id === mindMapId) {
          setSelectedMap(null);
          setView('list');
        }
      }
    } catch (error) {
      console.error('Error deleting mind map:', error);
    }
  };

  // SVG interactions
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.3, Math.min(3, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getNodeRadius = (node: MindMapNode) => {
    switch (node.node_type) {
      case 'root': return 50;
      case 'concept': return 40;
      case 'subconcept': return 30;
      case 'detail': return 20;
      default: return 30;
    }
  };

  const renderEdge = (edge: MindMapEdge) => {
    const source = selectedMap?.nodes.find(n => n.id === edge.source_node_id);
    const target = selectedMap?.nodes.find(n => n.id === edge.target_node_id);
    if (!source || !target) return null;

    return (
      <g key={edge.id}>
        <line
          x1={source.x_position}
          y1={source.y_position}
          x2={target.x_position}
          y2={target.y_position}
          stroke={edge.color}
          strokeWidth={edge.line_style === 'dashed' ? 2 : 3}
          strokeDasharray={edge.line_style === 'dashed' ? '5,5' : edge.line_style === 'dotted' ? '2,2' : undefined}
        />
        {edge.label && (
          <text
            x={(source.x_position + target.x_position) / 2}
            y={(source.y_position + target.y_position) / 2 - 5}
            textAnchor="middle"
            fill="#64748b"
            fontSize={12}
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  };

  const renderNode = (node: MindMapNode) => {
    const radius = getNodeRadius(node);
    const isSelected = selectedNode?.id === node.id;

    return (
      <g
        key={node.id}
        transform={`translate(${node.x_position}, ${node.y_position})`}
        onClick={() => setSelectedNode(node)}
        style={{ cursor: 'pointer' }}
      >
        <circle
          r={radius}
          fill={node.color}
          stroke={isSelected ? '#f59e0b' : '#ffffff'}
          strokeWidth={isSelected ? 4 : 2}
          filter="url(#shadow)"
        />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={node.node_type === 'root' ? 16 : node.node_type === 'concept' ? 14 : 12}
          fontWeight={node.node_type === 'root' ? 'bold' : 'normal'}
        >
          {node.concept.length > 15 ? node.concept.substring(0, 15) + '...' : node.concept}
        </text>
        {node.mastery_level !== undefined && node.mastery_level > 0 && (
          <circle
            r={radius + 5}
            fill="none"
            stroke="#10b981"
            strokeWidth={3}
            strokeDasharray={`${(node.mastery_level / 100) * 2 * Math.PI * (radius + 5)} ${2 * Math.PI * (radius + 5)}`}
            transform="rotate(-90)"
          />
        )}
      </g>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {view === 'editor' && selectedMap && (
                <button
                  onClick={() => setView('list')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Network className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {view === 'editor' && selectedMap ? selectedMap.title : 'Mind Maps'}
                </h1>
                <p className="text-sm text-slate-600">
                  {view === 'editor' ? 'Visualize connections between concepts' : 'Tạo mind map từ flashcards'}
                </p>
              </div>
            </div>

            {view === 'list' && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateFromFlashcards}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tự động tạo</span>
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo mới</span>
                </button>
              </div>
            )}

            {view === 'editor' && selectedMap && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScale(prev => Math.max(0.3, prev - 0.1))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  title="Zoom out"
                >
                  <ZoomOut className="w-5 h-5 text-slate-600" />
                </button>
                <span className="text-sm text-slate-600 w-16 text-center">{Math.round(scale * 100)}%</span>
                <button
                  onClick={() => setScale(prev => Math.min(3, prev + 0.1))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  title="Zoom in"
                >
                  <ZoomIn className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                  title="Reset view"
                >
                  <Maximize className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {view === 'list' ? (
          <div>
            {mindMaps.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 rounded-full mb-6">
                  <Network className="w-12 h-12 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có mind map</h2>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Tạo mind map từ flashcards để visualize mối liên hệ giữa các concepts
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleGenerateFromFlashcards}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Tự động tạo từ flashcards</span>
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-6 py-3 border-2 border-indigo-500 text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Tạo thủ công</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mindMaps.map((map) => (
                  <div
                    key={map.id}
                    className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => fetchMindMapDetails(map.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Network className="w-6 h-6 text-white" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMindMap(map.id);
                        }}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">{map.title}</h3>
                    {map.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{map.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{map.nodes?.length || 0} nodes</span>
                      <span>{map.edges?.length || 0} connections</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : selectedMap ? (
          <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Canvas */}
            <div className="flex-1 bg-white rounded-2xl shadow-md overflow-hidden">
              <svg
                ref={svgRef}
                className="w-full h-full"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                <defs>
                  <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                  </filter>
                </defs>
                <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
                  {/* Grid background */}
                  <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#grid)" />
                  
                  {/* Edges */}
                  {selectedMap.edges?.map(renderEdge)}
                  
                  {/* Nodes */}
                  {selectedMap.nodes?.map(renderNode)}
                </g>
              </svg>
            </div>

            {/* Sidebar */}
            <div className="w-80 bg-white rounded-2xl shadow-md p-6 overflow-y-auto">
              {selectedNode ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-800">Node Details</h3>
                    <button
                      onClick={() => setSelectedNode(null)}
                      className="p-1 hover:bg-slate-100 rounded-lg"
                    >
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-500">Concept</label>
                      <p className="font-medium text-slate-800">{selectedNode.concept}</p>
                    </div>
                    
                    {selectedNode.content && (
                      <div>
                        <label className="text-sm text-slate-500">Content</label>
                        <p className="text-slate-700 text-sm whitespace-pre-wrap">{selectedNode.content}</p>
                      </div>
                    )}
                    
                    <div>
                      <label className="text-sm text-slate-500">Type</label>
                      <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-600 text-xs rounded-full capitalize">
                        {selectedNode.node_type}
                      </span>
                    </div>
                    
                    {selectedNode.mastery_level !== undefined && selectedNode.mastery_level > 0 && (
                      <div>
                        <label className="text-sm text-slate-500">Mastery</label>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${selectedNode.mastery_level}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-600">{selectedNode.mastery_level}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-4">Mind Map Info</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-500">Title</label>
                      <p className="font-medium text-slate-800">{selectedMap.title}</p>
                    </div>
                    {selectedMap.description && (
                      <div>
                        <label className="text-sm text-slate-500">Description</label>
                        <p className="text-slate-700 text-sm">{selectedMap.description}</p>
                      </div>
                    )}
                    {selectedMap.topic && (
                      <div>
                        <label className="text-sm text-slate-500">Topic</label>
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">
                          {selectedMap.topic}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">{selectedMap.nodes?.length || 0}</p>
                        <p className="text-xs text-slate-500">Nodes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{selectedMap.edges?.length || 0}</p>
                        <p className="text-xs text-slate-500">Connections</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <p className="text-sm text-slate-500 text-center">
                      Click vào node để xem chi tiết
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Tạo Mind Map</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateMindMap} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tiêu đề</label>
                <input
                  type="text"
                  value={newMap.title}
                  onChange={(e) => setNewMap({ ...newMap, title: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: JavaScript Basics"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Mô tả (tùy chọn)</label>
                <textarea
                  value={newMap.description}
                  onChange={(e) => setNewMap({ ...newMap, description: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  placeholder="Mô tả về mind map..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Topic</label>
                <input
                  type="text"
                  value={newMap.topic}
                  onChange={(e) => setNewMap({ ...newMap, topic: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ví dụ: Programming, Math..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Layout</label>
                <div className="grid grid-cols-3 gap-3">
                  {['radial', 'tree', 'free'].map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      onClick={() => setNewMap({ ...newMap, layoutType: layout })}
                      className={`p-3 rounded-xl border-2 transition-all capitalize ${
                        newMap.layoutType === layout
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {layout === 'radial' && <Layout className="w-5 h-5 mx-auto mb-1" />}
                      {layout === 'tree' && <Network className="w-5 h-5 mx-auto mb-1" />}
                      {layout === 'free' && <Grid className="w-5 h-5 mx-auto mb-1" />}
                      {layout}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:shadow-lg"
                >
                  Tạo Mind Map
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
