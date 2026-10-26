import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { 
  Network, Shield, ShieldAlert, Server, Laptop, Monitor, Printer, 
  Wifi, Video, PhoneCall, Globe, Cloud, Plus, Trash2, Edit3, Save, 
  Download, RotateCcw, ZoomIn, ZoomOut, Move, Link2, Check, X, 
  AlertCircle, Copy, CheckCircle2, ChevronRight, Eye, Grid, Layers, 
  Box, Info, Share2, Cable, ArrowUpRight, Search, Sparkles, RefreshCw, Zap,
  Hand, Maximize2
} from "lucide-react";
import { 
  Company, NetworkDiagramData, NetworkNode, NetworkConnection, 
  NetworkSubnetZone, NetworkComponentType 
} from "../types";

interface NetworkDiagramBuilderProps {
  company: Company;
  currentUser?: { name?: string; role?: string; id?: number };
  onSaveDiagram: (data: { diagram_data: NetworkDiagramData; image_data?: string; notes?: string }) => Promise<void>;
  onClose: () => void;
  readOnly?: boolean;
}

// Preset component configuration definitions
interface ComponentDef {
  type: NetworkComponentType;
  label: string;
  category: "Core" | "Wireless" | "Servers" | "Endpoints";
  icon: React.ComponentType<{ className?: string }>;
  defaultColor: string;
  badge: string;
}

const COMPONENT_DEFS: ComponentDef[] = [
  // Core Infrastructure
  { type: "modem", label: "ISP Optical ONT / Modem", category: "Core", icon: Globe, defaultColor: "from-cyan-500 to-blue-600", badge: "WAN" },
  { type: "router", label: "Gateway Router", category: "Core", icon: Share2, defaultColor: "from-blue-600 to-indigo-700", badge: "Gateway" },
  { type: "firewall", label: "UTM Firewall", category: "Core", icon: ShieldAlert, defaultColor: "from-rose-500 to-red-700", badge: "Security" },
  { type: "core_switch", label: "Core Managed Switch", category: "Core", icon: Layers, defaultColor: "from-purple-600 to-indigo-800", badge: "Core L3" },
  { type: "switch", label: "Distribution Switch", category: "Core", icon: Network, defaultColor: "from-indigo-500 to-blue-700", badge: "Switch" },
  
  // Wireless & Cloud
  { type: "access_point", label: "Wi-Fi Access Point", category: "Wireless", icon: Wifi, defaultColor: "from-emerald-500 to-teal-700", badge: "Wi-Fi" },
  { type: "cloud", label: "Internet / Cloud Uplink", category: "Wireless", icon: Cloud, defaultColor: "from-sky-400 to-blue-600", badge: "Cloud" },

  // Servers & Storage
  { type: "server", label: "Application / DC Server", category: "Servers", icon: Server, defaultColor: "from-amber-500 to-orange-700", badge: "Server" },

  // Endpoints
  { type: "workstation", label: "Workstation PC", category: "Endpoints", icon: Monitor, defaultColor: "from-slate-600 to-slate-800", badge: "PC" },
  { type: "laptop", label: "Office Laptop", category: "Endpoints", icon: Laptop, defaultColor: "from-teal-600 to-cyan-800", badge: "Laptop" },
  { type: "printer", label: "Network Printer / MFD", category: "Endpoints", icon: Printer, defaultColor: "from-amber-600 to-yellow-700", badge: "Printer" },
  { type: "cctv", label: "IP Camera / NVR", category: "Endpoints", icon: Video, defaultColor: "from-rose-600 to-pink-800", badge: "CCTV" },
  { type: "voip", label: "VoIP Phone / PBX", category: "Endpoints", icon: PhoneCall, defaultColor: "from-sky-600 to-indigo-700", badge: "VoIP" },
];

const CONNECTION_TYPES = [
  { id: "cat6", label: "Cat6 Ethernet (1G/2.5G)", color: "#2563eb", strokeDash: "none", width: 2.5 },
  { id: "fiber", label: "Fiber Optic (10G/40G)", color: "#f97316", strokeDash: "6 3", width: 3 },
  { id: "wifi", label: "Wireless / Wi-Fi (5G/6G)", color: "#10b981", strokeDash: "4 4", width: 2 },
  { id: "uplink", label: "Trunk / Core Uplink", color: "#8b5cf6", strokeDash: "none", width: 4 },
] as const;

const ZONE_COLORS = [
  { id: "blue", label: "Office LAN", bg: "bg-blue-50/70 border-blue-300 text-blue-900" },
  { id: "emerald", label: "Guest Wi-Fi", bg: "bg-emerald-50/70 border-emerald-300 text-emerald-900" },
  { id: "purple", label: "Server Farm", bg: "bg-purple-50/70 border-purple-300 text-purple-900" },
  { id: "amber", label: "CCTV / Security", bg: "bg-amber-50/70 border-amber-300 text-amber-900" },
  { id: "rose", label: "DMZ / Isolation", bg: "bg-rose-50/70 border-rose-300 text-rose-900" },
];

export default function NetworkDiagramBuilder({
  company,
  currentUser,
  onSaveDiagram,
  onClose,
  readOnly = false
}: NetworkDiagramBuilderProps) {
  // Master diagram state
  const [nodes, setNodes] = useState<NetworkNode[]>(() => {
    if (company.network_diagram_data?.nodes && Array.isArray(company.network_diagram_data.nodes)) {
      return company.network_diagram_data.nodes;
    }
    return [];
  });

  const [connections, setConnections] = useState<NetworkConnection[]>(() => {
    if (company.network_diagram_data?.connections && Array.isArray(company.network_diagram_data.connections)) {
      return company.network_diagram_data.connections;
    }
    return [];
  });

  const [zones, setZones] = useState<NetworkSubnetZone[]>(() => {
    if (company.network_diagram_data?.zones && Array.isArray(company.network_diagram_data.zones)) {
      return company.network_diagram_data.zones;
    }
    return [];
  });

  const [notes, setNotes] = useState<string>(company.network_diagram_notes || "");

  // 🌐 Unified Interactive Workspace: Editing and Viewing are combined seamlessly!
  const isEditMode = !readOnly;
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<"select" | "pan">("select");
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [activeConnectionType, setActiveConnectionType] = useState<"cat6" | "fiber" | "wifi" | "uplink">("cat6");

  // Smooth Interactive Wire Drawing & Hover
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isWireDragging, setIsWireDragging] = useState(false);

  // Switch Port Config Modal
  const [switchPortDialogDef, setSwitchPortDialogDef] = useState<ComponentDef | null>(null);
  const [selectedSwitchPorts, setSelectedSwitchPorts] = useState<number>(24);
  const [selectedSwitchModel, setSelectedSwitchModel] = useState<string>("");

  // Canvas Viewport transformation (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Synchronous interaction refs for butter-smooth panning & dragging
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panRef = useRef(pan);
  panRef.current = pan;

  const draggingNodeIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Grid constants
  const GRID_SIZE = 20;
  const CANVAS_WIDTH = 2400;
  const CANVAS_HEIGHT = 1600;

  // Keyboard shortcut listener (Space = Pan, Esc = Cancel wire/modal, V = Select, H = Pan)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName);
      if (e.code === "Space" && !isInput) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.key === "Escape") {
        setConnectingSourceId(null);
        setHoveredNodeId(null);
        setIsWireDragging(false);
        setSwitchPortDialogDef(null);
      }
      if ((e.key === "v" || e.key === "V") && !isInput) {
        setActiveTool("select");
      }
      if ((e.key === "h" || e.key === "H") && !isInput) {
        setActiveTool("pan");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Fit all nodes into screen view
  const handleFitToContent = () => {
    if (nodes.length === 0) {
      setZoom(1);
      setPan({ x: 40, y: 40 });
      return;
    }
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x)) + 160;
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y)) + 100;

    const canvasWidth = canvasRef.current?.clientWidth || 1000;
    const canvasHeight = canvasRef.current?.clientHeight || 650;

    const contentWidth = Math.max(400, maxX - minX + 100);
    const contentHeight = Math.max(300, maxY - minY + 100);

    const fitZoom = Math.max(0.4, Math.min(1.4, Number((Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight)).toFixed(2))));
    const newPanX = Math.round((canvasWidth - (maxX - minX) * fitZoom) / 2 - minX * fitZoom);
    const newPanY = Math.round((canvasHeight - (maxY - minY) * fitZoom) / 2 - minY * fitZoom);

    setZoom(fitZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Selected node object
  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Selected connection object
  const selectedConnection = useMemo(() => {
    return connections.find(c => c.id === selectedConnectionId) || null;
  }, [connections, selectedConnectionId]);

  // Snap coordinate helper
  const snap = useCallback((val: number) => {
    if (!snapToGrid) return Math.round(val);
    return Math.round(val / GRID_SIZE) * GRID_SIZE;
  }, [snapToGrid]);

  // Clear entire diagram
  const handleClearCanvas = () => {
    if (nodes.length === 0) return;
    if (window.confirm("Are you sure you want to clear all devices and connections from this diagram?")) {
      setNodes([]);
      setConnections([]);
      setZones([]);
      setSelectedNodeId(null);
      setSelectedConnectionId(null);
      setSelectedZoneId(null);
      setConnectingSourceId(null);
    }
  };

  // Add new component to diagram with optional port configuration
  const handleAddComponent = (def: ComponentDef, customPorts?: number, customModel?: string) => {
    // Determine spawn position roughly centered or staggered
    const offset = nodes.length * 25;
    const spawnX = snap(360 + (offset % 300));
    const spawnY = snap(220 + (offset % 200));

    const existingOfSameType = nodes.filter(n => n.type === def.type).length;
    const autoNumber = existingOfSameType + 1;

    const isSwitchType = def.type === "switch" || def.type === "core_switch";
    const portsCount = customPorts || (isSwitchType ? 24 : def.type === "router" ? 5 : undefined);

    let defaultLabel = customModel;
    if (!defaultLabel) {
      if (def.type === "switch") {
        defaultLabel = `${portsCount}P Switch #${autoNumber}`;
      } else if (def.type === "core_switch") {
        defaultLabel = `${portsCount}P Core Switch #${autoNumber}`;
      } else {
        defaultLabel = `${def.label.split(" ")[0]} #${autoNumber}`;
      }
    }

    const newNode: NetworkNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: def.type,
      label: defaultLabel,
      ip: def.type === "router" ? "192.168.1.1" : def.type === "switch" || def.type === "core_switch" ? "192.168.1.2" : "",
      x: spawnX,
      y: spawnY,
      status: "online",
      ports_count: portsCount
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setSelectedConnectionId(null);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Duplicate node
  const handleDuplicateNode = (node: NetworkNode) => {
    const newNode: NetworkNode = {
      ...node,
      id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: `${node.label} (Copy)`,
      x: snap(node.x + 40),
      y: snap(node.y + 40)
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  // Delete connection
  const handleDeleteConnection = (id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    if (selectedConnectionId === id) setSelectedConnectionId(null);
  };

  // ⚡ Complete connection between connectingSourceId and targetNodeId
  const completeConnection = (targetNodeId: string) => {
    if (!connectingSourceId) return;
    if (connectingSourceId === targetNodeId) {
      // Clicked same node -> cancel cleanly
      setConnectingSourceId(null);
      setHoveredNodeId(null);
      setIsWireDragging(false);
      return;
    }

    // Check if connection already exists between these 2 nodes
    const alreadyConnected = connections.some(
      c => (c.fromId === connectingSourceId && c.toId === targetNodeId) || 
           (c.fromId === targetNodeId && c.toId === connectingSourceId)
    );

    if (alreadyConnected) {
      const existing = connections.find(
        c => (c.fromId === connectingSourceId && c.toId === targetNodeId) || 
             (c.fromId === targetNodeId && c.toId === connectingSourceId)
      );
      if (existing) {
        setSelectedConnectionId(existing.id);
        setSelectedNodeId(null);
      }
      setConnectingSourceId(null);
      setHoveredNodeId(null);
      setIsWireDragging(false);
      return;
    }

    const fromNode = nodes.find(n => n.id === connectingSourceId);
    const toNode = nodes.find(n => n.id === targetNodeId);

    // Auto calculate port labels if connecting to/from a switch or router
    let fromPort = "";
    let toPort = "";

    if (fromNode && (fromNode.type === "switch" || fromNode.type === "core_switch" || fromNode.type === "router")) {
      const existingConns = connections.filter(c => c.fromId === fromNode.id || c.toId === fromNode.id).length;
      fromPort = `Port ${existingConns + 1}`;
    }

    if (toNode && (toNode.type === "switch" || toNode.type === "core_switch" || toNode.type === "router")) {
      const existingConns = connections.filter(c => c.fromId === toNode.id || c.toId === toNode.id).length;
      toPort = `Port ${existingConns + 1}`;
    }

    const defaultLabel = 
      activeConnectionType === "fiber" ? "10 Gbps Fiber" :
      activeConnectionType === "uplink" ? "Trunk Uplink" :
      activeConnectionType === "wifi" ? "Wi-Fi 5G" :
      "1 Gbps Cat6";

    const newConn: NetworkConnection = {
      id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fromId: connectingSourceId,
      toId: targetNodeId,
      type: activeConnectionType,
      label: defaultLabel,
      fromPort: fromPort || undefined,
      toPort: toPort || undefined
    };

    setConnections(prev => [...prev, newConn]);
    setSelectedConnectionId(newConn.id);
    setSelectedNodeId(null);
    setConnectingSourceId(null);
    setHoveredNodeId(null);
    setIsWireDragging(false);
  };

  // Start wire dragging from anchor handle
  const startWireDrag = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingSourceId(nodeId);
    setIsWireDragging(true);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
  };

  // Connect node click
  const handleNodeClick = (node: NetworkNode, e: React.MouseEvent) => {
    e.stopPropagation();

    if (connectingSourceId) {
      completeConnection(node.id);
      return;
    }

    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setSelectedZoneId(null);
  };

  // Window-level mouse listeners for butter-smooth dragging & panning (never drops tracking)
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Canvas map panning
      if (isPanningRef.current) {
        e.preventDefault();
        setPan({
          x: Math.round(e.clientX - panStartRef.current.x),
          y: Math.round(e.clientY - panStartRef.current.y)
        });
        return;
      }

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;
      const mouseX = (e.clientX - canvasRect.left - currentPan.x) / currentZoom;
      const mouseY = (e.clientY - canvasRect.top - currentPan.y) / currentZoom;

      if (isWireDragging) {
        setMouseCanvasPos({ x: mouseX, y: mouseY });
      }

      // 2. Node card repositioning
      if (draggingNodeIdRef.current && isEditMode) {
        e.preventDefault();
        const activeNodeId = draggingNodeIdRef.current;
        const newX = snap(mouseX - dragOffsetRef.current.x);
        const newY = snap(mouseY - dragOffsetRef.current.y);

        setNodes(prev => prev.map(n => {
          if (n.id === activeNodeId) {
            return {
              ...n,
              x: Math.max(20, Math.min(CANVAS_WIDTH - 160, newX)),
              y: Math.max(20, Math.min(CANVAS_HEIGHT - 100, newY))
            };
          }
          return n;
        }));
      }
    };

    const handleWindowMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }

      if (draggingNodeIdRef.current) {
        draggingNodeIdRef.current = null;
        setDraggingNodeId(null);
      }

      if (isWireDragging && connectingSourceId) {
        if (hoveredNodeId && hoveredNodeId !== connectingSourceId) {
          completeConnection(hoveredNodeId);
        }
        setIsWireDragging(false);
      }
    };

    window.addEventListener("mousemove", handleWindowMouseMove, { passive: false });
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isEditMode, isWireDragging, connectingSourceId, hoveredNodeId, snap]);

  // Start dragging node, select node, or pan canvas
  const handleNodeMouseDown = (node: NetworkNode, e: React.MouseEvent) => {
    // If Pan Tool is active or Spacebar is held or middle click, pan canvas instead of dragging node
    if (activeTool === "pan" || isSpacePressed || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
      setIsPanning(true);
      return;
    }

    if (e.button !== 0) return;

    if (connectingSourceId) {
      e.stopPropagation();
      completeConnection(node.id);
      return;
    }

    e.stopPropagation();
    setSelectedNodeId(node.id);
    setSelectedConnectionId(null);
    setSelectedZoneId(null);

    if (!isEditMode) return;

    // Calculate mouse position relative to node top-left
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const mouseX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const mouseY = (e.clientY - canvasRect.top - pan.y) / zoom;
      const offset = {
        x: mouseX - node.x,
        y: mouseY - node.y
      };
      dragOffsetRef.current = offset;
      setDragOffset(offset);
      draggingNodeIdRef.current = node.id;
      setDraggingNodeId(node.id);
    }
  };

  // Canvas mouse move tracker for coordinates and wire preview
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (canvasRect) {
      const mouseX = (e.clientX - canvasRect.left - pan.x) / zoom;
      const mouseY = (e.clientY - canvasRect.top - pan.y) / zoom;
      setMouseCanvasPos({ x: mouseX, y: mouseY });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isWireDragging && connectingSourceId) {
      if (hoveredNodeId && hoveredNodeId !== connectingSourceId) {
        completeConnection(hoveredNodeId);
      }
      setIsWireDragging(false);
    }
    isPanningRef.current = false;
    draggingNodeIdRef.current = null;
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Canvas Pan start on background drag
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Middle-click pan support
    if (e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
      setIsPanning(true);
      return;
    }

    if (e.button !== 0) return;

    const target = e.target as HTMLElement;

    // Do NOT start canvas panning if clicked inside a node card, button, input, or interactive element
    if (
      target.closest(".group\\/node") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea")
    ) {
      return;
    }

    // Do NOT start canvas panning if clicked on an SVG connection clickable path
    if (target.tagName === "path" && target.classList.contains("cursor-pointer")) {
      return;
    }

    e.preventDefault();

    if (connectingSourceId) {
      setConnectingSourceId(null);
      setHoveredNodeId(null);
      setIsWireDragging(false);
      return;
    }

    // Start canvas panning immediately
    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    };
    setIsPanning(true);
    setSelectedNodeId(null);
    setSelectedConnectionId(null);
    setSelectedZoneId(null);
  };

  // Mouse wheel zooms in and out centered at mouse position
  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Zoom direction: scrolling up (deltaY < 0) = zoom in, scrolling down = zoom out
    const zoomMultiplier = e.deltaY < 0 ? 1.12 : 0.88;

    setZoom(prevZoom => {
      const nextZoom = Math.max(0.25, Math.min(2.5, Number((prevZoom * zoomMultiplier).toFixed(2))));
      if (nextZoom === prevZoom) return prevZoom;

      // Mouse position relative to canvas container
      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;

      // Anchor zoom so mouse position remains steady
      setPan(prevPan => ({
        x: Math.round(mouseX - (mouseX - prevPan.x) * (nextZoom / prevZoom)),
        y: Math.round(mouseY - (mouseY - prevPan.y) * (nextZoom / prevZoom))
      }));

      return nextZoom;
    });
  };

  // Render SVG connection lines between nodes
  const connectionPaths = useMemo(() => {
    const nodeMap = new Map<string, NetworkNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const NODE_WIDTH = 130;
    const NODE_HEIGHT = 70;

    return connections.map(conn => {
      const fromNode = nodeMap.get(conn.fromId);
      const toNode = nodeMap.get(conn.toId);
      if (!fromNode || !toNode) return null;

      const fromCenterX = fromNode.x + NODE_WIDTH / 2;
      const fromCenterY = fromNode.y + NODE_HEIGHT / 2;
      const toCenterX = toNode.x + NODE_WIDTH / 2;
      const toCenterY = toNode.y + NODE_HEIGHT / 2;

      // Calculate smooth curved path
      const dx = toCenterX - fromCenterX;
      const dy = toCenterY - fromCenterY;
      const midX = (fromCenterX + toCenterX) / 2;
      const midY = (fromCenterY + toCenterY) / 2;

      // Slight curve for visual elegance
      const curveOffset = Math.min(30, Math.hypot(dx, dy) * 0.08);
      const perpX = -dy / (Math.hypot(dx, dy) || 1) * curveOffset;
      const perpY = dx / (Math.hypot(dx, dy) || 1) * curveOffset;

      const controlX = midX + perpX;
      const controlY = midY + perpY;

      const pathData = `M ${fromCenterX} ${fromCenterY} Q ${controlX} ${controlY} ${toCenterX} ${toCenterY}`;

      const connDef = CONNECTION_TYPES.find(ct => ct.id === (conn.type || "cat6")) || CONNECTION_TYPES[0];
      const isSelected = selectedConnectionId === conn.id;

      return {
        ...conn,
        fromCenterX,
        fromCenterY,
        toCenterX,
        toCenterY,
        midX: controlX,
        midY: controlY,
        pathData,
        color: isSelected ? "#3b82f6" : connDef.color,
        strokeDash: connDef.strokeDash,
        width: isSelected ? connDef.width + 2 : connDef.width,
        isSelected
      };
    }).filter(Boolean);
  }, [connections, nodes, selectedConnectionId]);

  // Export diagram to PNG raster image using HTML5 Canvas & SVG serializer
  const generatePngSnapshot = async (): Promise<string | undefined> => {
    try {
      // Find bounding box of all nodes with margin
      if (nodes.length === 0) return undefined;

      const minX = Math.max(0, Math.min(...nodes.map(n => n.x)) - 60);
      const minY = Math.max(0, Math.min(...nodes.map(n => n.y)) - 60);
      const maxX = Math.max(...nodes.map(n => n.x)) + 220;
      const maxY = Math.max(...nodes.map(n => n.y)) + 160;

      const exportWidth = Math.max(800, maxX - minX);
      const exportHeight = Math.max(600, maxY - minY);

      const offCanvas = document.createElement("canvas");
      offCanvas.width = exportWidth;
      offCanvas.height = exportHeight;
      const ctx = offCanvas.getContext("2d");
      if (!ctx) return undefined;

      // Draw background
      ctx.fillStyle = "#0f172a"; // Deep tech slate
      ctx.fillRect(0, 0, exportWidth, exportHeight);

      // Draw grid dots
      ctx.fillStyle = "#334155";
      for (let x = 0; x < exportWidth; x += 30) {
        for (let y = 0; y < exportHeight; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw company title banner on top
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`${company.name} • Network Architecture Diagram`, 30, 35);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px monospace";
      ctx.fillText(`Generated on ${new Date().toLocaleDateString()} | PATS IT Infrastructure`, 30, 52);

      // Draw connections
      ctx.lineWidth = 2.5;
      connectionPaths.forEach(conn => {
        if (!conn) return;
        ctx.strokeStyle = conn.color || "#3b82f6";
        if (conn.type === "wifi") ctx.setLineDash([4, 4]);
        else if (conn.type === "fiber") ctx.setLineDash([8, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        ctx.moveTo(conn.fromCenterX - minX, conn.fromCenterY - minY);
        ctx.quadraticCurveTo(conn.midX - minX, conn.midY - minY, conn.toCenterX - minX, conn.toCenterY - minY);
        ctx.stroke();

        // Draw connection label
        if (conn.label) {
          ctx.fillStyle = "#cbd5e1";
          ctx.font = "bold 9px sans-serif";
          ctx.fillText(conn.label, conn.midX - minX + 5, conn.midY - minY - 5);
        }
      });
      ctx.setLineDash([]);

      // Draw node cards
      nodes.forEach(node => {
        const x = node.x - minX;
        const y = node.y - minY;
        const w = 130;
        const h = 68;

        // Node card background
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        // Top accent line
        ctx.fillStyle = node.type === "firewall" ? "#f43f5e" : node.type === "router" ? "#3b82f6" : node.type === "access_point" ? "#10b981" : "#8b5cf6";
        ctx.beginPath();
        ctx.roundRect(x, y, w, 4, [8, 8, 0, 0]);
        ctx.fill();

        // Status indicator dot
        ctx.fillStyle = node.status === "offline" ? "#ef4444" : node.status === "standby" ? "#f59e0b" : "#10b981";
        ctx.beginPath();
        ctx.arc(x + 12, y + 18, 4, 0, Math.PI * 2);
        ctx.fill();

        // Node Type badge
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 8px monospace";
        ctx.fillText(node.type.toUpperCase(), x + 22, y + 21);

        // Switch Port count badge
        if (node.ports_count || node.type === "switch" || node.type === "core_switch") {
          const portText = `${node.ports_count || 24}P`;
          ctx.fillStyle = "#818cf8";
          ctx.font = "bold 8px monospace";
          ctx.fillText(portText, x + w - 26, y + 21);
        }

        // Node Label
        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 10px sans-serif";
        const truncatedLabel = node.label.length > 17 ? node.label.substring(0, 15) + "..." : node.label;
        ctx.fillText(truncatedLabel, x + 10, y + 40);

        // IP Address
        if (node.ip) {
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 9px monospace";
          ctx.fillText(node.ip, x + 10, y + 56);
        }
      });

      return offCanvas.toDataURL("image/png");
    } catch (e) {
      console.warn("Could not generate snapshot:", e);
      return undefined;
    }
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const diagramData: NetworkDiagramData = {
        nodes,
        connections,
        zones,
        updated_at: new Date().toISOString()
      };

      const snapshot = await generatePngSnapshot();

      await onSaveDiagram({
        diagram_data: diagramData,
        image_data: snapshot,
        notes: notes.trim()
      });

      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3000);
    } catch (err: any) {
      console.error("Save diagram error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Download high-res diagram image
  const handleDownloadImage = async () => {
    const pngUrl = await generatePngSnapshot();
    if (!pngUrl) return;
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `${company.name.replace(/\s+/g, "_")}_Network_Architecture.png`;
    a.click();
  };

  // Download raw JSON diagram
  const handleDownloadJson = () => {
    const payload = JSON.stringify({
      company: company.name,
      company_id: company.id,
      exported_at: new Date().toISOString(),
      diagram_data: { nodes, connections, zones, notes }
    }, null, 2);

    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${company.name.replace(/\s+/g, "_")}_Network_Diagram.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy IP helper
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Filtered nodes for search
  const searchedNodeIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase();
    const matches = nodes.filter(n => 
      n.label.toLowerCase().includes(q) ||
      (n.ip && n.ip.toLowerCase().includes(q)) ||
      (n.subnet && n.subnet.toLowerCase().includes(q)) ||
      (n.location && n.location.toLowerCase().includes(q)) ||
      n.type.toLowerCase().includes(q)
    );
    return new Set(matches.map(m => m.id));
  }, [nodes, searchQuery]);

  return (
    <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden relative font-sans">
      
      {/* 🧭 TOP TOOLBAR */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0 z-30">
        
        {/* Left: Company Title & Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shadow-inner shrink-0">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {company.name}
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                company.type === "AMC" 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30"
              }`}>
                {company.type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>{nodes.length} Component{nodes.length === 1 ? "" : "s"}</span>
              <span>•</span>
              <span>{connections.length} Link{connections.length === 1 ? "" : "s"}</span>
              {connectingSourceId && (
                <span className="text-amber-400 font-bold animate-pulse">
                  • Click target device to connect
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search & Viewport / Mode Controls */}
        <div className="hidden md:flex items-center gap-2">
          {/* Search nodes */}
          <div className="relative w-48">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Find IP / Device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 pl-8 pr-3 py-1 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Simplified Tool & Viewport Controls */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {/* Tool Switcher */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTool("select")}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTool === "select"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Select & Move (V)"
              >
                <Move className="h-3.5 w-3.5" />
                <span>Move</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("pan")}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeTool === "pan"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Pan Map (H or Space)"
              >
                <Hand className="h-3.5 w-3.5" />
                <span>Pan</span>
              </button>
            </div>

            {/* Palette Toggle */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isPaletteOpen
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-950 text-slate-400 hover:text-white"
                }`}
                title="Toggle Component Palette"
              >
                <Box className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Palette</span>
              </button>
            )}

            <div className="h-4 w-px bg-slate-800" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 px-1">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.3, Number((z - 0.15).toFixed(2))))}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="font-mono text-xs px-1.5 font-bold text-slate-300 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFitToContent}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors ml-1"
                title="Fit to Screen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Actions (Templates, Export, Save, Close) */}
        <div className="flex items-center gap-2">
          {/* Clear Canvas Action */}
          {isEditMode && nodes.length > 0 && (
            <button
              type="button"
              onClick={handleClearCanvas}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 hover:border-rose-800/50 flex items-center gap-1.5"
              title="Clear all components from canvas"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}

          {/* Export PNG */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={nodes.length === 0}
            className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5 shadow-2xs"
            title="Download PNG snapshot"
          >
            <Download className="h-3.5 w-3.5 text-slate-300" />
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          {/* Save Button */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-900/30"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          )}

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Close Diagram Builder"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 🛠️ WORKSPACE AREA */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* 📦 LEFT PALETTE: COMPONENTS DOCK */}
        {isEditMode && isPaletteOpen && (
          <aside className="w-56 lg:w-64 bg-slate-950/95 border-r border-slate-800 p-3 flex flex-col gap-3 shrink-0 z-20 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5">
                <Box className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest font-mono">
                  Components
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse Palette"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick Link Tool */}
            <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                  <Cable className="h-3.5 w-3.5 text-blue-400" />
                  Cable / Link Mode
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {CONNECTION_TYPES.map(ct => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setActiveConnectionType(ct.id as any)}
                    className={`px-2 py-1 rounded-lg text-left font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      activeConnectionType === ct.id
                        ? "bg-blue-600 text-white border-blue-400 shadow-2xs"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    <span className="w-2.5 h-1 rounded-full shrink-0" style={{ backgroundColor: ct.color }} />
                    <span className="truncate">{ct.id.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Components by Category */}
            {(["Core", "Wireless", "Servers", "Endpoints"] as const).map(category => (
              <div key={category} className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">
                  {category}
                </span>
                <div className="space-y-1">
                  {COMPONENT_DEFS.filter(c => c.category === category).map(def => {
                    const IconComp = def.icon;
                    const isSwitch = def.type === "switch" || def.type === "core_switch";

                    if (isSwitch) {
                      return (
                        <div
                          key={def.type}
                          className="w-full rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/50 p-2 text-left transition-all group"
                        >
                          <div
                            onClick={() => {
                              setSelectedSwitchPorts(24);
                              setSelectedSwitchModel("");
                              setSwitchPortDialogDef(def);
                            }}
                            className="flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${def.defaultColor} flex items-center justify-center text-white shrink-0 shadow-xs`}>
                                <IconComp className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate block">
                                  {def.label}
                                </span>
                                <span className="text-[10px] text-blue-400 font-mono">
                                  Choose Port Density ↓
                                </span>
                              </div>
                            </div>
                            <div className="p-1 bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white rounded-lg transition-colors">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                          </div>

                          {/* Quick Port Density Pills */}
                          <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-800/80">
                            <span className="text-[9px] text-slate-500 font-mono font-bold uppercase mr-0.5">Ports:</span>
                            {[8, 16, 24, 48].map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddComponent(def, p);
                                }}
                                className="flex-1 py-1 px-1 bg-slate-800/90 hover:bg-blue-600 active:scale-95 text-slate-200 hover:text-white rounded-md text-[10px] font-mono font-black border border-slate-700/80 hover:border-blue-400 transition-all text-center cursor-pointer"
                                title={`Add ${p}-Port ${def.label}`}
                              >
                                {p}P
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSwitchPorts(24);
                                setSelectedSwitchModel("");
                                setSwitchPortDialogDef(def);
                              }}
                              className="py-1 px-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-md text-[10px] font-mono border border-slate-700/80 transition-all cursor-pointer font-bold"
                              title="Custom Switch Port Density & Model"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={def.type}
                        type="button"
                        onClick={() => handleAddComponent(def)}
                        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${def.defaultColor} flex items-center justify-center text-white shrink-0 shadow-xs`}>
                            <IconComp className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                            {def.label}
                          </span>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-slate-500 group-hover:text-blue-400 shrink-0 ml-1 transition-transform group-hover:scale-110" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Subnet Zone Creator */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 px-1">
                Subnet / VLAN Zones
              </span>
              <button
                type="button"
                onClick={() => {
                  const newZone: NetworkSubnetZone = {
                    id: `zone-${Date.now()}`,
                    name: `VLAN Zone #${zones.length + 1}`,
                    vlan: `VLAN ${10 * (zones.length + 1)}`,
                    color: ZONE_COLORS[zones.length % ZONE_COLORS.length].id,
                    x: 200,
                    y: 200,
                    width: 480,
                    height: 280
                  };
                  setZones(prev => [...prev, newZone]);
                }}
                className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 hover:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Box className="h-3.5 w-3.5 text-blue-400" />
                <span>+ Add Subnet Zone Box</span>
              </button>
            </div>
          </aside>
        )}

        {/* 🗺️ INTERACTIVE CANVAS VIEWPORT */}
        <div
          ref={canvasRef}
          id="canvas-bg"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleCanvasWheel}
          className={`flex-1 overflow-hidden relative select-none ${
            isPanning
              ? "cursor-grabbing"
              : activeTool === "pan" || isSpacePressed
              ? "cursor-grab"
              : connectingSourceId
              ? "cursor-crosshair"
              : "cursor-default"
          }`}
          style={{
            backgroundColor: "#0b0f19",
            backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }}
        >
          {/* Floating Reopen Palette Button */}
          {!isPaletteOpen && isEditMode && (
            <button
              type="button"
              onClick={() => setIsPaletteOpen(true)}
              className="absolute top-4 left-4 z-30 bg-slate-900/95 hover:bg-slate-800 border border-slate-700/80 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xl backdrop-blur-md cursor-pointer transition-all hover:scale-102"
              title="Open Component Palette"
            >
              <Box className="h-3.5 w-3.5 text-blue-400" />
              <span>+ Add Components</span>
            </button>
          )}

          {/* Floating Canvas Navigation Hint */}
          <div className="absolute bottom-4 left-4 z-30 hidden sm:flex items-center gap-2.5 bg-slate-950/85 border border-slate-800 text-slate-400 text-[11px] font-mono px-3 py-1.5 rounded-xl backdrop-blur-md pointer-events-none shadow-lg">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">Hold & Drag</kbd>
              <span>Move on map</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">Scroll</kbd>
              <span>Zoom In & Out</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">Space</kbd>
              <span>Pan tool</span>
            </span>
          </div>

          {/* Zoomable & Pannable Master Stage */}
          <div
            id="canvas-stage"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              position: "absolute",
              left: 0,
              top: 0
            }}
          >
            {/* SVG Connection Layer */}
            <svg
              ref={svgRef}
              className="absolute inset-0 pointer-events-none w-full h-full"
              style={{ overflow: "visible" }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="5"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                </marker>
              </defs>

              {/* Subnet / VLAN Zones Background Boxes */}
              {zones.map(zone => {
                const zoneColorDef = ZONE_COLORS.find(zc => zc.id === zone.color) || ZONE_COLORS[0];
                return (
                  <g key={zone.id}>
                    <rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.width}
                      height={zone.height}
                      rx="16"
                      fill="rgba(30, 41, 59, 0.4)"
                      stroke="#334155"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={zone.x + 16}
                      y={zone.y + 24}
                      fill="#94a3b8"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      letterSpacing="0.05em"
                    >
                      {zone.name.toUpperCase()} {zone.vlan ? `• ${zone.vlan}` : ""}
                    </text>
                  </g>
                );
              })}

              {/* Render Connections */}
              {connectionPaths.map(conn => {
                if (!conn) return null;
                return (
                  <g key={conn.id} className="pointer-events-auto">
                    {/* Invisible thicker stroke for easy clicking */}
                    <path
                      d={conn.pathData}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedConnectionId(conn.id);
                        setSelectedNodeId(null);
                      }}
                    />
                    {/* Visual rendered link line */}
                    <path
                      d={conn.pathData}
                      fill="none"
                      stroke={conn.color}
                      strokeWidth={conn.width}
                      strokeDasharray={conn.strokeDash}
                      className="transition-all"
                    />
                    {/* Connection center label */}
                    {conn.label && (
                      <g
                        transform={`translate(${conn.midX}, ${conn.midY})`}
                        className="cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConnectionId(conn.id);
                          setSelectedNodeId(null);
                        }}
                      >
                        <rect
                          x={-28}
                          y={-10}
                          width={56}
                          height={20}
                          rx={5}
                          fill="#0f172a"
                          stroke={conn.isSelected ? "#3b82f6" : "#334155"}
                          strokeWidth="1"
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill={conn.isSelected ? "#60a5fa" : "#cbd5e1"}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {conn.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
              {/* ⚡ Live Interactive Preview Cable while connecting */}
              {(() => {
                if (!connectingSourceId) return null;
                const sourceNode = nodes.find(n => n.id === connectingSourceId);
                if (!sourceNode) return null;

                const NODE_W = 150;
                const NODE_H = 76;
                const fromX = sourceNode.x + NODE_W / 2;
                const fromY = sourceNode.y + NODE_H / 2;

                let toX = mouseCanvasPos.x;
                let toY = mouseCanvasPos.y;

                if (hoveredNodeId && hoveredNodeId !== connectingSourceId) {
                  const targetNode = nodes.find(n => n.id === hoveredNodeId);
                  if (targetNode) {
                    toX = targetNode.x + NODE_W / 2;
                    toY = targetNode.y + NODE_H / 2;
                  }
                }

                const dx = toX - fromX;
                const dy = toY - fromY;
                const midX = (fromX + toX) / 2;
                const midY = (fromY + toY) / 2;
                const curveOffset = Math.min(35, Math.hypot(dx, dy) * 0.08);
                const perpX = -dy / (Math.hypot(dx, dy) || 1) * curveOffset;
                const perpY = dx / (Math.hypot(dx, dy) || 1) * curveOffset;
                const controlX = midX + perpX;
                const controlY = midY + perpY;
                const pathD = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;

                const connDef = CONNECTION_TYPES.find(ct => ct.id === activeConnectionType) || CONNECTION_TYPES[0];

                return (
                  <g className="pointer-events-none">
                    {/* Outer ambient glow */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={connDef.color}
                      strokeWidth={connDef.width + 6}
                      strokeOpacity="0.35"
                      strokeLinecap="round"
                    />
                    {/* Animated active cable line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={connDef.color}
                      strokeWidth={connDef.width + 1}
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      className="animate-pulse"
                    />
                    {/* Target ping indicator */}
                    <circle
                      cx={toX}
                      cy={toY}
                      r="7"
                      fill={connDef.color}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                    <circle
                      cx={toX}
                      cy={toY}
                      r="3"
                      fill="#ffffff"
                    />
                  </g>
                );
              })()}
            </svg>

            {/* DOM Nodes Layer */}
            {nodes.map(node => {
              const def = COMPONENT_DEFS.find(d => d.type === node.type) || COMPONENT_DEFS[0];
              const IconComp = def.icon;
              const isSelected = selectedNodeId === node.id;
              const isConnectingSource = connectingSourceId === node.id;
              const isTargetCandidate = !!connectingSourceId && !isConnectingSource;
              const isHoveredTarget = hoveredNodeId === node.id && isTargetCandidate;
              const isHighlighted = searchedNodeIds.has(node.id);

              const isSwitch = node.type === "switch" || node.type === "core_switch";
              const totalPorts = node.ports_count || (isSwitch ? 24 : undefined);
              const connectedPortsCount = connections.filter(c => c.fromId === node.id || c.toId === node.id).length;

              return (
                <div
                  key={node.id}
                  onClick={(e) => handleNodeClick(node, e)}
                  onMouseDown={(e) => handleNodeMouseDown(node, e)}
                  onMouseEnter={() => {
                    if (connectingSourceId && connectingSourceId !== node.id) {
                      setHoveredNodeId(node.id);
                    }
                  }}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseUp={() => {
                    if (isWireDragging && connectingSourceId && connectingSourceId !== node.id) {
                      completeConnection(node.id);
                    }
                  }}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: "150px"
                  }}
                  className={`absolute rounded-xl transition-all select-none group/node ${
                    activeTool === "pan" || isSpacePressed
                      ? "cursor-grab active:cursor-grabbing"
                      : draggingNodeId === node.id
                      ? "cursor-grabbing ring-2 ring-blue-400 shadow-2xl z-40 scale-[1.02]"
                      : isConnectingSource
                      ? "cursor-crosshair"
                      : isTargetCandidate
                      ? "cursor-pointer"
                      : isEditMode
                      ? "cursor-grab active:cursor-grabbing hover:shadow-xl hover:border-slate-500"
                      : "cursor-pointer"
                  } ${
                    isConnectingSource
                      ? "ring-4 ring-amber-400 bg-amber-950/60 shadow-2xl shadow-amber-500/20 z-30 scale-[1.02]"
                      : isHoveredTarget
                      ? "ring-4 ring-emerald-400 bg-emerald-950/80 shadow-2xl shadow-emerald-500/40 z-30 scale-[1.04] cursor-pointer"
                      : isTargetCandidate
                      ? "ring-2 ring-emerald-500/70 bg-slate-900 hover:ring-4 hover:ring-emerald-400 cursor-pointer z-20"
                      : isSelected
                      ? "ring-2 ring-blue-500 shadow-xl shadow-blue-500/20 z-20"
                      : isHighlighted
                      ? "ring-2 ring-emerald-400 animate-bounce-subtle z-20"
                      : "border border-slate-700/80 hover:border-slate-500 z-10"
                  } bg-slate-900 shadow-lg p-2.5 flex flex-col justify-between`}
                >
                  {/* ⚡ Floating Target Connector Banner when hovering during link mode */}
                  {isHoveredTarget && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 font-black text-[9.5px] px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap z-40 flex items-center gap-1 animate-bounce-subtle">
                      <Zap className="h-3 w-3 fill-current" />
                      <span>CLICK TO LINK</span>
                    </div>
                  )}

                  {/* 4-Directional Interactive Connector Pins (North, South, East, West) */}
                  {isEditMode && (
                    <>
                      {/* Top Pin */}
                      <button
                        type="button"
                        onMouseDown={(e) => startWireDrag(node.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingSourceId) completeConnection(node.id);
                          else setConnectingSourceId(node.id);
                        }}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400 hover:border-emerald-400 hover:bg-emerald-400 hover:scale-130 transition-all opacity-0 group-hover/node:opacity-100 z-30 cursor-crosshair shadow-sm"
                        title="Drag wire or click to connect"
                      />
                      {/* Bottom Pin */}
                      <button
                        type="button"
                        onMouseDown={(e) => startWireDrag(node.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingSourceId) completeConnection(node.id);
                          else setConnectingSourceId(node.id);
                        }}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400 hover:border-emerald-400 hover:bg-emerald-400 hover:scale-130 transition-all opacity-0 group-hover/node:opacity-100 z-30 cursor-crosshair shadow-sm"
                        title="Drag wire or click to connect"
                      />
                      {/* Left Pin */}
                      <button
                        type="button"
                        onMouseDown={(e) => startWireDrag(node.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingSourceId) completeConnection(node.id);
                          else setConnectingSourceId(node.id);
                        }}
                        className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400 hover:border-emerald-400 hover:bg-emerald-400 hover:scale-130 transition-all opacity-0 group-hover/node:opacity-100 z-30 cursor-crosshair shadow-sm"
                        title="Drag wire or click to connect"
                      />
                      {/* Right Pin */}
                      <button
                        type="button"
                        onMouseDown={(e) => startWireDrag(node.id, e)}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (connectingSourceId) completeConnection(node.id);
                          else setConnectingSourceId(node.id);
                        }}
                        className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-950 border-2 border-blue-400 hover:border-emerald-400 hover:bg-emerald-400 hover:scale-130 transition-all opacity-0 group-hover/node:opacity-100 z-30 cursor-crosshair shadow-sm"
                        title="Drag wire or click to connect"
                      />
                    </>
                  )}

                  {/* Top Header: Badge, Status, Connect Button */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[9px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {def.badge}
                      </span>
                      {isSwitch && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {totalPorts}P
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Status indicator */}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          node.status === "offline" 
                            ? "bg-rose-500 shadow-rose-500/50" 
                            : node.status === "standby" 
                            ? "bg-amber-400 shadow-amber-400/50" 
                            : "bg-emerald-400 shadow-emerald-400/50"
                        } shadow-xs`}
                        title={`Status: ${node.status || "online"}`}
                      />

                      {/* Connect Node Trigger Button */}
                      {isEditMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (connectingSourceId === node.id) {
                              setConnectingSourceId(null);
                            } else if (connectingSourceId) {
                              completeConnection(node.id);
                            } else {
                              setConnectingSourceId(node.id);
                            }
                          }}
                          className={`p-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            isConnectingSource
                              ? "bg-amber-500 text-slate-950 font-extrabold scale-110"
                              : isTargetCandidate
                              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold animate-pulse"
                              : "bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white"
                          }`}
                          title={isConnectingSource ? "Cancel Connection" : isTargetCandidate ? "Connect to this device" : "Connect cable to another device"}
                        >
                          <Link2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Icon & Label */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${def.defaultColor} flex items-center justify-center text-white shrink-0 shadow-xs`}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-white leading-tight line-clamp-2" title={node.label}>
                      {node.label}
                    </span>
                  </div>

                  {/* Switch Port Occupancy Row */}
                  {isSwitch && (
                    <div className="my-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[9px] font-mono">
                      <span className="text-slate-400">Ports Used:</span>
                      <span className={`font-bold ${connectedPortsCount >= (totalPorts || 24) ? "text-rose-400" : "text-emerald-400"}`}>
                        {connectedPortsCount} / {totalPorts || 24}
                      </span>
                    </div>
                  )}

                  {/* IP Address Pill / Subnet */}
                  <div className="mt-0.5 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    {node.ip ? (
                      <span className="text-sky-400 font-bold truncate select-all" title={node.ip}>
                        {node.ip}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No IP</span>
                    )}

                    {node.ip && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyIp(node.ip || "");
                        }}
                        className="text-slate-500 hover:text-white p-0.5 rounded transition-colors"
                        title="Copy IP"
                      >
                        {copiedIp === node.ip ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ⚡ ACTIVE WIRE DRAWING GUIDANCE BANNER */}
          {connectingSourceId && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-amber-500/60 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 z-40 backdrop-blur-md animate-fade-in font-sans">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
              <div className="text-xs">
                <span className="text-amber-400 font-bold uppercase tracking-wider font-mono mr-1.5">[CABLE MODE]</span>
                <span>Connecting from <strong>{nodes.find(n => n.id === connectingSourceId)?.label || "Device"}</strong>: Click target device or port handle to connect</span>
                <span className="text-slate-400 ml-2 font-mono text-[11px]">(Esc to cancel)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConnectingSourceId(null);
                  setHoveredNodeId(null);
                  setIsWireDragging(false);
                }}
                className="ml-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Empty Canvas Prompt */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 shadow-xl">
                <Network className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-black text-white">
                Network Architecture Canvas is Empty
              </h4>
              <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                Start designing this company&apos;s network layout by selecting components from the palette.
              </p>
              {isEditMode && (
                <div className="mt-4 flex flex-wrap gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setIsPaletteOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Box className="h-3.5 w-3.5 text-white" />
                    <span>Open Component Palette</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 📋 RIGHT INSPECTOR DRAWER (When a component or link is selected) */}
        {(selectedNode || selectedConnection) && (
          <aside className="w-72 lg:w-80 bg-slate-950/95 border-l border-slate-800 p-4 flex flex-col justify-between shrink-0 z-20 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-4">
                {/* Node Inspector Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-300 font-mono">
                      Device Properties
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 text-slate-500 hover:text-white rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Device Name / Label */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Device Label
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    value={selectedNode.label}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, label: newLabel } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-bold"
                  />
                </div>

                {/* Device Type Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Component Type
                  </label>
                  <select
                    disabled={!isEditMode}
                    value={selectedNode.type}
                    onChange={(e) => {
                      const newType = e.target.value as NetworkComponentType;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, type: newType } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-white focus:outline-none transition-all cursor-pointer font-sans"
                  >
                    {COMPONENT_DEFS.map(def => (
                      <option key={def.type} value={def.type}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 🎛️ Physical Ports Configuration (Switches / Routers) */}
                {(selectedNode.type === "switch" || selectedNode.type === "core_switch" || selectedNode.type === "router") && (
                  <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 space-y-2.5 font-sans">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-blue-400" />
                        Switch Port Density
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-extrabold bg-blue-950 text-blue-300 border border-blue-800">
                        {selectedNode.ports_count || 24} Ports
                      </span>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Select Switch Ports:
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[8, 16, 24, 48].map(p => (
                          <button
                            key={p}
                            type="button"
                            disabled={!isEditMode}
                            onClick={() => {
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { 
                                ...n, 
                                ports_count: p,
                                label: n.label.replace(/\b(8|16|24|48)P\b/i, `${p}P`).replace(/\b(8|16|24|48)-Port\b/i, `${p}-Port`)
                              } : n));
                            }}
                            className={`py-1 rounded text-xs font-mono font-bold transition-all border cursor-pointer ${
                              (selectedNode.ports_count || 24) === p
                                ? "bg-blue-600 text-white border-blue-400 shadow-xs font-black"
                                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                            }`}
                          >
                            {p}P
                          </button>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">Custom Count:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={2}
                            max={96}
                            disabled={!isEditMode}
                            value={selectedNode.ports_count || 24}
                            onChange={(e) => {
                              const p = parseInt(e.target.value) || 24;
                              setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, ports_count: p } : n));
                            }}
                            className="w-16 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-xs font-mono text-white text-center focus:border-blue-500 font-bold"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">Ports</span>
                        </div>
                      </div>
                    </div>

                    {/* Port Utilization meter */}
                    {(() => {
                      const activeCount = connections.filter(c => c.fromId === selectedNode.id || c.toId === selectedNode.id).length;
                      const totalP = selectedNode.ports_count || 24;
                      const isFull = activeCount >= totalP;
                      return (
                        <div className="space-y-1 pt-1.5 border-t border-slate-800">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-400">Port Utilization:</span>
                            <span className={`font-bold ${isFull ? "text-rose-400" : "text-emerald-400"}`}>
                              {activeCount} / {totalP} Active ({Math.max(0, totalP - activeCount)} Free)
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full transition-all rounded-full ${
                                isFull ? "bg-rose-500" : activeCount / totalP > 0.8 ? "bg-amber-400" : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, (activeCount / totalP) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Quick Connect Trigger Button from Inspector */}
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setConnectingSourceId(selectedNode.id);
                        }}
                        className="w-full py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                      >
                        <Cable className="h-3.5 w-3.5" />
                        <span>Link Cable from this Switch</span>
                      </button>
                    )}
                  </div>
                )}

                {/* IP Address Field */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>IP Address</span>
                    {selectedNode.ip && (
                      <button
                        type="button"
                        onClick={() => handleCopyIp(selectedNode.ip || "")}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
                      >
                        {copiedIp === selectedNode.ip ? "Copied!" : "Copy IP"}
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    placeholder="e.g. 192.168.1.1"
                    value={selectedNode.ip || ""}
                    onChange={(e) => {
                      const newIp = e.target.value;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, ip: newIp } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-sky-400 placeholder-slate-500 focus:outline-none transition-all font-mono font-bold"
                  />
                </div>

                {/* Subnet / VLAN */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Subnet Mask / VLAN
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    placeholder="e.g. VLAN 10 (255.255.255.0)"
                    value={selectedNode.subnet || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, subnet: val } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* MAC Address */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Hardware MAC Address
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    placeholder="e.g. 00:1A:2B:3C:4D:5E"
                    value={selectedNode.mac || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, mac: val } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Location / Workstation Bay */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Physical Location / Rack Bay
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    placeholder="e.g. Server Room Rack A - U12"
                    value={selectedNode.location || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, location: val } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-sans"
                  />
                </div>

                {/* Operational Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Device Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["online", "standby", "offline"] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        disabled={!isEditMode}
                        onClick={() => {
                          setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, status: st } : n));
                        }}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold capitalize transition-all border cursor-pointer ${
                          selectedNode.status === st
                            ? st === "online" 
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-extrabold"
                              : st === "standby"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-extrabold"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/50 font-extrabold"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diagnostics Notes */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Credentials & Port Notes
                  </label>
                  <textarea
                    rows={2}
                    disabled={!isEditMode}
                    placeholder="e.g. Admin interface port 8443, PoE enabled on ports 1-8"
                    value={selectedNode.notes || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes(prev => prev.map(n => n.id === selectedNode.id ? { ...n, notes: val } : n));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 p-2 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-mono resize-none"
                  />
                </div>

                {/* Node Actions */}
                {isEditMode && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicateNode(selectedNode)}
                      className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            ) : selectedConnection ? (
              <div className="space-y-4">
                {/* Connection Inspector Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Cable className="h-4 w-4 text-blue-400" />
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-300 font-mono">
                      Link Properties
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedConnectionId(null)}
                    className="p-1 text-slate-500 hover:text-white rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Connection Endpoints Display */}
                {(() => {
                  const fromNode = nodes.find(n => n.id === selectedConnection.fromId);
                  const toNode = nodes.find(n => n.id === selectedConnection.toId);
                  return (
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">Device A:</span>
                        <strong className="text-slate-200">{fromNode?.label || "Device A"}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">Device B:</span>
                        <strong className="text-slate-200">{toNode?.label || "Device B"}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Connection Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Medium / Cable Type
                  </label>
                  <select
                    disabled={!isEditMode}
                    value={selectedConnection.type || "cat6"}
                    onChange={(e) => {
                      const newType = e.target.value as any;
                      setConnections(prev => prev.map(c => c.id === selectedConnection.id ? { ...c, type: newType } : c));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-white focus:outline-none transition-all cursor-pointer font-sans"
                  >
                    {CONNECTION_TYPES.map(ct => (
                      <option key={ct.id} value={ct.id}>
                        {ct.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Port Assignments */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Device A Port
                    </label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      placeholder="e.g. Port 1"
                      value={selectedConnection.fromPort || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConnections(prev => prev.map(c => c.id === selectedConnection.id ? { ...c, fromPort: val } : c));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-2.5 py-1 rounded-lg text-xs text-white placeholder-slate-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Device B Port
                    </label>
                    <input
                      type="text"
                      disabled={!isEditMode}
                      placeholder="e.g. Port 2"
                      value={selectedConnection.toPort || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConnections(prev => prev.map(c => c.id === selectedConnection.id ? { ...c, toPort: val } : c));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-2.5 py-1 rounded-lg text-xs text-white placeholder-slate-500 font-mono"
                    />
                  </div>
                </div>

                {/* Connection Label / Speed */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Link Speed / Label
                  </label>
                  <input
                    type="text"
                    disabled={!isEditMode}
                    placeholder="e.g. 1 Gbps, 10 Gbps, Trunk"
                    value={selectedConnection.label || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setConnections(prev => prev.map(c => c.id === selectedConnection.id ? { ...c, label: val } : c));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* Delete Connection */}
                {isEditMode && (
                  <div className="pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleDeleteConnection(selectedConnection.id)}
                      className="w-full py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete Connection Link</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Bottom: General Topology Notes */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Overall Architecture Notes
              </label>
              <textarea
                rows={3}
                disabled={!isEditMode}
                placeholder="ISP account numbers, DNS servers, gateway IPs..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 p-2.5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all font-mono resize-none leading-relaxed"
              />
            </div>
          </aside>
        )}
      </div>

      {/* 🎛️ SWITCH PORT CONFIGURATION MODAL */}
      {switchPortDialogDef && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-scale-in text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">Add {switchPortDialogDef.label}</h4>
                  <p className="text-[11px] text-slate-400">Select physical port density and hardware model</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwitchPortDialogDef(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Port density buttons */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Select Number of Physical Ports
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ports: 8, title: "8 Ports", desc: "Compact Desktop / Edge Switch" },
                  { ports: 16, title: "16 Ports", desc: "SMB / Floor Distribution" },
                  { ports: 24, title: "24 Ports (Standard)", desc: "1U Managed Rackmount Switch" },
                  { ports: 48, title: "48 Ports", desc: "Enterprise High-Density 1U" },
                ].map(opt => (
                  <button
                    key={opt.ports}
                    type="button"
                    onClick={() => setSelectedSwitchPorts(opt.ports)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedSwitchPorts === opt.ports
                        ? "bg-blue-600/25 border-blue-500 text-white ring-1 ring-blue-500 shadow-xs"
                        : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm font-mono">{opt.title}</span>
                      {selectedSwitchPorts === opt.ports && <Check className="h-4 w-4 text-blue-400 stroke-[3]" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom ports input */}
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-300 font-bold">Or Enter Custom Port Count:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={96}
                  value={selectedSwitchPorts}
                  onChange={(e) => setSelectedSwitchPorts(parseInt(e.target.value) || 24)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center font-mono font-bold text-white focus:border-blue-500"
                />
                <span className="text-xs text-slate-400 font-mono">Ports</span>
              </div>
            </div>

            {/* Switch Model / Label */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Switch Model / Custom Label (Optional)
              </label>
              <input
                type="text"
                placeholder={`e.g. Cisco CBS350-${selectedSwitchPorts}P, Aruba 1930 ${selectedSwitchPorts}G`}
                value={selectedSwitchModel}
                onChange={(e) => setSelectedSwitchModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 font-mono"
              />
              {/* Quick model suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  `Cisco CBS350-${selectedSwitchPorts}P`,
                  `Aruba Instant On 1930 ${selectedSwitchPorts}G`,
                  `D-Link DGS-${selectedSwitchPorts}D`,
                  `UniFi Switch ${selectedSwitchPorts} PoE`
                ].map(model => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => setSelectedSwitchModel(model)}
                    className="text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
                  >
                    {model}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSwitchPortDialogDef(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddComponent(switchPortDialogDef, selectedSwitchPorts, selectedSwitchModel.trim() || undefined);
                  setSwitchPortDialogDef(null);
                  setSelectedSwitchModel("");
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add {selectedSwitchPorts}-Port Switch to Canvas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔔 SAVE SUCCESS TOAST */}
      {saveSuccessToast && (
        <div className="absolute bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 border border-emerald-400/50">
          <CheckCircle2 className="h-4 w-4" />
          <span>Network diagram and architecture topology saved successfully!</span>
        </div>
      )}
    </div>
  );
}
