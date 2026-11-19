# Bird Flight – Prototipo de vuelo controlado por body tracking

Proyecto desarrollado durante prácticas profesionales en AudacIA.  
Juego web en 3D donde el jugador controla un halcón con la cámara mediante detección de pose (MoveNet).

## Estructura del proyecto

```
Bird_Flight/
├── README.md                 ← Instrucciones de uso (este archivo)
├── requirements.txt          ← Dependencias y requisitos
└── codigo/                   ← Código fuente
    ├── index.html
    ├── css/style.css
    └── js/
        ├── config.js         ← Física, cámara, optimización
        ├── pose.js           ← Detección de pose y gestos
        ├── bird.js           ← Modelo 3D del halcón y física de vuelo
        └── main.js           ← Mundo 3D, aros, colisiones y loop principal
```

## Cómo ejecutar (Linux)

```bash
cd codigo
python3 -m http.server 8080
```

Abrir en el navegador: **http://localhost:8080**

> **Importante:** Usar `localhost`, no `0.0.0.0`. La API de cámara requiere contexto seguro.

## Controles

| Gesto del jugador | Acción del halcón |
|-------------------|-------------------|
| Brazos abiertos | Planear (descenso lento) |
| Aletear (brazos arriba/abajo) | Subir / despegar (requiere 3 aleteos desde el suelo) |
| Brazos cerrados | Picada |
| Inclinarse a un lado (brazos abiertos) | Girar proporcional a la inclinación |
| Tecla Espacio o ambas manos en la cabeza | Pausar / reanudar |

## Objetivo del juego

- Atravesar aros dorados que aparecen en el aire.
- Al tocar el suelo se reinicia el contador de aros.
- Se guarda el récord en `localStorage`.

## Optimizaciones incluidas

- MoveNet Lightning + resolución de cámara 640×480
- Pose desacoplada del render
- Árboles y nubes como billboards (sprites)
- Sin sombras
- Instancing de vegetación

## Notas

- Desarrollado para entorno local (PC / Raspberry Pi 4).
- El modelo 3D del halcón, física, colisiones y puntuación están en `codigo/js/`.
