#!/usr/bin/env python3
"""
Evalúa un modelo SAC entrenado en el entorno Ball-on-Plate.
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from stable_baselines3 import SAC

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from ball_on_plate_env import BallOnPlateEnv


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="models/best/best_model")
    parser.add_argument("--episodes", type=int, default=10)
    args = parser.parse_args()

    model_path = ROOT / args.model
    if not model_path.with_suffix(".zip").exists() and not model_path.exists():
        print(f"Modelo no encontrado: {model_path}")
        sys.exit(1)

    print(f"Cargando {model_path}")
    model = SAC.load(str(model_path))

    env = BallOnPlateEnv()
    rewards = []
    lengths = []

    for ep in range(args.episodes):
        obs, _ = env.reset()
        done = False
        total_r = 0.0
        steps = 0
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, r, terminated, truncated, info = env.step(action)
            total_r += r
            steps += 1
            done = terminated or truncated
        rewards.append(total_r)
        lengths.append(steps)
        print(f"Ep {ep+1:2d}: reward={total_r:7.1f}  steps={steps:3d}  final_dist={info['dist']:.3f}")

    print(f"\nPromedio reward: {np.mean(rewards):.1f}  ± {np.std(rewards):.1f}")
    print(f"Promedio steps : {np.mean(lengths):.1f}")


if __name__ == "__main__":
    main()
