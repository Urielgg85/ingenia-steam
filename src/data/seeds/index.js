const seeds = [
  {
    id: "act-bridge-v1",
    title: "Puentes que aguantan",
    objective: "Construye un puente que cruce un río y prueba cuánta carga soporta.",
    materials: ["Bloques", "Cartón", "Cinta", "Muñecos/Coches"],
    materialsMedia: [
      { kind: "image", url: "https://picsum.photos/seed/bridge/600/360", name:"ref.jpg" }
    ],
    sections: [
      { name:"diseña", text:"Dibuja tu idea rápida.", media:[], allowUploads:true, uploadKinds:["image"], maxUploads:2 },
      { name:"construye", text:"Usa los materiales para armar el puente.", media:[], allowUploads:true, uploadKinds:["image","video"], maxUploads:3 },
      { name:"prueba", text:"Coloca peso paso a paso y observa.", media:[], allowUploads:true, uploadKinds:["video"], maxUploads:2 },
      { name:"mejora", text:"¿Qué cambiarías para soportar más?", media:[], allowUploads:true, uploadKinds:["image"], maxUploads:2 },
      { name:"comparte", text:"Toma una foto final y escribe un nombre para tu puente.", media:[], allowUploads:true, uploadKinds:["image","link"], maxUploads:2 }
    ]
  }
]
export default seeds
