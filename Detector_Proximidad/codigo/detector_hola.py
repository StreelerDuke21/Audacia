#!/usr/bin/env python3
"""
Detector de Proximidad Interactivo - Raspberry Pi 4
====================================================
Sistema que usa un sensor ultrasónico HC-SR04 para detectar personas
y reproducir videos de un avatar digital:

- Sin detección: reproduce en bucle el video estático (part1)
- Con detección: reproduce el video de saludo (part2) una sola vez
  y vuelve al estático.

Cableado (según tutorial SunFounder):
  - Trig → GPIO 17
  - Echo → GPIO 27

Arranque automático con systemd.
"""

from gpiozero import DistanceSensor
from time import sleep, time
import vlc
import os
from datetime import datetime

# ============ CONFIGURACIÓN ============
TRIGGER_PIN = 17
ECHO_PIN = 27

# Rutas de los videos (ajusta según donde los coloques)
PART1 = "/home/audacia/Desktop/part1mary(1).mp4"           # video estático (bucle)
PART2 = "/home/audacia/Desktop/gemini_generated_video_af85f443.mp4"  # video de saludo

DISTANCIA_DETECCION = 60     # cm - se activa si está más cerca de esta distancia
COOLDOWN = 10                # segundos mínimos entre reproducciones del saludo
# =======================================

sensor = DistanceSensor(echo=ECHO_PIN, trigger=TRIGGER_PIN, max_distance=2)

# Instancia única de VLC (evita parpadeo al cambiar de video)
instance = vlc.Instance([
    '--fullscreen',
    '--no-video-title-show',
    '--no-osd',
    '--quiet',
    '--aout=pulse'
])
player = instance.media_player_new()

media_idle = instance.media_new(PART1)
media_idle.add_option('input-repeat=-1')   # bucle infinito

media_saludo = instance.media_new(PART2)

ultima_reproduccion = 0
reproduciendo_saludo = False


def log(mensaje):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {mensaje}")


def play_idle():
    """Reproduce el video estático en bucle."""
    global reproduciendo_saludo
    reproduciendo_saludo = False
    player.set_media(media_idle)
    player.play()
    log("Video estático (part1) en bucle")


def play_saludo():
    """Reproduce el saludo una sola vez y luego vuelve al estático."""
    global reproduciendo_saludo, ultima_reproduccion
    reproduciendo_saludo = True
    ultima_reproduccion = time()

    log("¡Persona detectada! Reproduciendo saludo (part2)")
    player.set_media(media_saludo)

    player.audio_set_mute(False)
    player.audio_set_volume(100)
    player.play()
    sleep(0.5)  # dar tiempo a que arranque el audio

    while True:
        estado = player.get_state()
        if estado in (vlc.State.Ended, vlc.State.Stopped, vlc.State.Error):
            break
        sleep(0.1)

    play_idle()


def main():
    log("Sistema iniciado - Detector de Proximidad Interactivo")
    log(f"Se activará el saludo cuando la distancia sea < {DISTANCIA_DETECCION} cm")

    if not os.path.exists(PART1):
        log(f"ERROR: No se encontró {PART1}")
        return
    if not os.path.exists(PART2):
        log(f"ERROR: No se encontró {PART2}")
        return

    play_idle()

    try:
        while True:
            if not reproduciendo_saludo:
                distancia = sensor.distance * 100  # en cm

                if distancia < DISTANCIA_DETECCION:
                    if time() - ultima_reproduccion > COOLDOWN:
                        play_saludo()

            sleep(0.2)

    except KeyboardInterrupt:
        log("Detenido por el usuario.")
    finally:
        player.stop()
        sensor.close()
        log("Sistema cerrado.")


if __name__ == "__main__":
    main()
