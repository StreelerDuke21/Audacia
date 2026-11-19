#!/usr/bin/env python3
"""
Entrena un agente SAC en el entorno Ball-on-Plate.
"""

import argparse
import sys
from pathlib import Path

import gymnasium as gym
from stable_baselines3 import SAC
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from ball_on_plate_env import BallOnPlateEnv


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--timesteps", type=int, default=300_000)
    parser.add_argument("--eval-freq", type=int, default=5000)
    args = parser.parse_args()

    # Directorios
    models_dir = ROOT / "models"
    logs_dir = ROOT / "logs"
    models_dir.mkdir(exist_ok=True)
    logs_dir.mkdir(exist_ok=True)

    # Entorno de entrenamiento
    env = Monitor(BallOnPlateEnv())
    eval_env = Monitor(BallOnPlateEnv())

    # Callbacks
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(models_dir / "best"),
        log_path=str(logs_dir),
        eval_freq=args.eval_freq,
        deterministic=True,
        render=False,
        n_eval_episodes=5,
    )

    checkpoint_callback = CheckpointCallback(
        save_freq=30_000,
        save_path=str(models_dir / "checkpoints"),
        name_prefix="sac_ball",
    )

    # Modelo
    model = SAC(
        "MlpPolicy",
        env,
        verbose=1,
        learning_rate=3e-4,
        buffer_size=100_000,
        learning_starts=1000,
        batch_size=256,
        tau=0.005,
        gamma=0.99,
        train_freq=1,
        gradient_steps=1,
        policy_kwargs=dict(net_arch=[256, 256]),
        tensorboard_log=str(logs_dir / "tb"),
        device="auto",
    )

    print(f"Entrenando {args.timesteps} timesteps...")
    model.learn(
        total_timesteps=args.timesteps,
        callback=[eval_callback, checkpoint_callback],
        progress_bar=True,
    )

    final_path = models_dir / "sac_ball_final"
    model.save(str(final_path))
    print(f"Modelo final guardado en {final_path}")


if __name__ == "__main__":
    main()
