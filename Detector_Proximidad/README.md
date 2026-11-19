# Detector de Proximidad Interactivo

Sistema desarrollado durante prácticas profesionales en AudacIA.

Usa un sensor ultrasónico **HC-SR04** conectado a una **Raspberry Pi 4** para detectar personas y reproducir videos de un avatar digital:

- **Sin detección** → video estático en bucle (part1)
- **Con detección** → video de saludo (part2) una sola vez, luego vuelve al estático

El sistema arranca automáticamente al encender la Raspberry mediante un servicio **systemd**.

---

## Estructura del proyecto

```
Detector_Proximidad/
├── codigo/
│   └── detector_hola.py      ← Script principal
├── README.md                 ← Instrucciones de uso (este archivo)
└── requirements.txt
```

---

## Hardware necesario

| Componente | Conexión |
|------------|----------|
| Sensor HC-SR04 | Trig → GPIO **17**, Echo → GPIO **27** |
| Raspberry Pi 4 | Raspberry Pi OS |
| Monitor + parlantes | Para mostrar y escuchar los videos |

> Cableado según el tutorial de SunFounder (Lección 23 - Ultrasonic).

---

## Instalación

```bash
# Actualizar e instalar dependencias
sudo apt update
sudo apt install -y python3-pip python3-gpiozero python3-vlc vlc

# Opcional: instalar desde requirements.txt
pip3 install -r requirements.txt
```

Coloca los dos videos en la ruta configurada en el script (por defecto `/home/audacia/Desktop/`):

- `part1mary(1).mp4` → video estático
- `gemini_generated_video_af85f443.mp4` → video de saludo

---

## Uso manual (prueba)

```bash
cd codigo
python3 detector_hola.py
```

- El video estático debe empezar en bucle.
- Acércate al sensor (< 60 cm) y debe reproducir el saludo.
- Al terminar el saludo vuelve automáticamente al estático.

---

## Arranque automático (systemd)

1. Crea el servicio:

```bash
sudo nano /etc/systemd/system/detector-hola.service
```

2. Pega este contenido (ajusta el usuario y la ruta si es necesario):

```ini
[Unit]
Description=Detector de proximidad - Avatar digital
After=graphical.target
Wants=graphical.target

[Service]
Type=simple
User=audacia
Group=audacia
WorkingDirectory=/home/audacia/Desktop/Detector_Proximidad/codigo
Environment=DISPLAY=:0
Environment=XDG_RUNTIME_DIR=/run/user/1000
ExecStart=/usr/bin/python3 /home/audacia/Desktop/Detector_Proximidad/codigo/detector_hola.py
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
```

3. Actívalo:

```bash
sudo systemctl daemon-reload
sudo systemctl enable detector-hola.service
sudo systemctl start detector-hola.service
```

4. Verifica:

```bash
sudo systemctl status detector-hola.service
```

---

## Configuración importante

En el archivo `detector_hola.py` puedes ajustar:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `DISTANCIA_DETECCION` | Distancia en cm para activar el saludo | 60 |
| `COOLDOWN` | Segundos mínimos entre saludos | 10 |
| `PART1` / `PART2` | Rutas de los videos | `/home/audacia/Desktop/...` |

---

## Notas

- El sensor ultrasónico puede dar lecturas inestables; el cooldown evita repeticiones rápidas.
- Si no hay audio, verifica el volumen del sistema (`pactl set-sink-volume @DEFAULT_SINK@ 100%`) y el volumen físico de los parlantes.
- Para detener el servicio: `sudo systemctl stop detector-hola.service`

## Licencia

Código libre para uso educativo.
