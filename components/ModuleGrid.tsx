"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRAIState } from "../lib/raiState";

interface Node {
  id: number;
  x: number;
  y: number;
  size: number;
}

export default function ModuleGrid() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const { animations } = useRAIState();

  useEffect(() => {
    const arr: Node[] = [];
    for (let i = 0; i < 40; i++) {
      arr.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
      });
    }
    setNodes(arr);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full bg-cyan-400/70 shadow-[0_0_10px_#00ffff]"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: node.size,
            height: node.size,
          }}
          animate={
            animations
              ? { opacity: [0.2, 0.9, 0.2], scale: [1, 1.3, 1] }
              : { opacity: 0.4, scale: 1 }
          }
          transition={{
            duration: Math.random() * 3 + 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
