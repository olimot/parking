import { mat3, vec2 } from "gl-matrix";
import { useLayoutEffect, useRef, useState } from "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

const fract = 0.1;

export default function App() {
  const [vehicle, setVehicle] = useState({
    x: 500,
    y: 100,
    speed: 0,
    gCarA: 0,
    gWheelA: Math.PI / 6,
    width: 50,
    length: 100,
    wheelA: 0,
    steering: "" as "" | "pointer" | "key",
    pressedKeys: {} as Record<string, unknown>,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const [{ inlineSize, blockSize }] = entry.devicePixelContentBoxSize;
      if (canvas.width === inlineSize && canvas.height === blockSize) return;
      Object.assign(canvas, { width: inlineSize, height: blockSize });
    });

    const pointer = { pressed: false, movement: [0, 0] as vec2 };

    const onPointerDown = (e: PointerEvent) => {
      const { pointerId } = e;
      pointer.pressed = true;
      setVehicle((prev) => ({ ...prev, steering: "pointer" }));

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const delta = (Math.PI / 2) * ((e.movementX * devicePixelRatio) / 480);
        setVehicle((prev) => {
          const wheelTargetA = prev.wheelA + delta;
          return { ...prev, wheelA: wheelTargetA };
        });
      };
      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        pointer.pressed = false;
        setVehicle((prev) => {
          if (prev.steering !== "pointer") return prev;
          return { ...prev, steering: "" };
        });
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      setVehicle((prev) => ({
        ...prev,
        pressedKeys: { ...prev.pressedKeys, [e.code]: true },
      }));
    };

    const onKeyUp = (e: KeyboardEvent) => {
      setVehicle((prev) => {
        const pressedKeys = { ...prev.pressedKeys };
        delete pressedKeys[e.code];
        return { ...prev, pressedKeys };
      });
    };

    let rafId = requestAnimationFrame(function callback() {
      rafId = requestAnimationFrame(callback);
      setVehicle((prev) => {
        let accel = 0;
        if (prev.pressedKeys["KeyW"]) accel = 0.2;
        else if (prev.pressedKeys["KeyS"]) accel = -0.2;
        let speed = 0;
        if (prev.speed < 0) {
          speed = Math.min(Math.max(prev.speed + accel + fract, -3), 0);
        } else if (prev.speed > 0) {
          speed = Math.min(Math.max(prev.speed + accel - fract, 0), 3);
        } else if (accel) {
          speed = Math.min(Math.max(prev.speed + accel - fract, -3), 3);
        }

        let dTargetWA = 0;
        let { steering } = prev;
        if (steering !== "pointer") {
          steering = "key";
          if (prev.pressedKeys["KeyA"]) dTargetWA = -0.02;
          else if (prev.pressedKeys["KeyD"]) dTargetWA = 0.02;
          else steering = "";
        }

        const vSpeed = vec2.fromValues(speed, 0);
        vec2.rotate(vSpeed, vSpeed, [0, 0], prev.gWheelA);
        const x = prev.x + vSpeed[0];
        const y = prev.y + vSpeed[1];

        const l = prev.length;
        const wheelA0 = prev.gWheelA - prev.gCarA;

        const maxA = Math.PI / 4;

        let wheelA =
          steering === "pointer"
            ? prev.wheelA
            : wheelA0 -
              Math.asin(0.01 * Math.abs(speed) * Math.sin(wheelA0)) +
              dTargetWA;

        wheelA = Math.min(Math.max(wheelA, -maxA), maxA);

        const gCarA = prev.gCarA + Math.asin((speed / l) * Math.sin(wheelA0));
        const gWheelA = wheelA + gCarA;
        return { ...prev, x, y, speed, gCarA, gWheelA, wheelA, steering };
      });
    });

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    let rafId = requestAnimationFrame(function callback() {
      rafId = requestAnimationFrame(callback);

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      ctx.fillStyle = "#e0e0e0";
      const center = (ctx.canvas.width - 480) / 2;
      ctx.fillRect(center, 10, 480, 24);

      const wheelA = vehicle.gCarA - vehicle.gWheelA;
      const wx = center + 240 - 240 * (wheelA / (Math.PI / 4));
      ctx.beginPath();
      ctx.ellipse(wx, 22, 12, 12, 0, 0, 2 * Math.PI);

      ctx.fillStyle = vehicle.steering ? "#e00000" : "#400000";
      ctx.fill();

      const tmp: vec2 = [0, 0];
      const pos: vec2 = [vehicle.x, vehicle.y];
      const mat = mat3.fromTranslation(mat3.create(), pos);
      mat3.rotate(mat, mat, vehicle.gCarA);

      const fl: vec2 = [0, -vehicle.width / 2];
      const fr: vec2 = [0, vehicle.width / 2];
      const rl: vec2 = [-vehicle.length, vehicle.width / 2];
      const rr: vec2 = [-vehicle.length, -vehicle.width / 2];
      vec2.transformMat3(fl, fl, mat);
      vec2.transformMat3(fr, fr, mat);
      vec2.transformMat3(rl, rl, mat);
      vec2.transformMat3(rr, rr, mat);

      mat3.fromRotation(mat, vehicle.gCarA);
      ctx.beginPath();
      let [x, y] = vec2.add(tmp, fl, vec2.transformMat3(tmp, [15, -5], mat));
      ctx.moveTo(x, y);
      [x, y] = vec2.add(tmp, fr, vec2.transformMat3(tmp, [15, 5], mat));
      ctx.lineTo(x, y);
      [x, y] = vec2.add(tmp, rl, vec2.transformMat3(tmp, [-15, 5], mat));
      ctx.lineTo(x, y);
      [x, y] = vec2.add(tmp, rr, vec2.transformMat3(tmp, [-15, -5], mat));
      ctx.lineTo(x, y);
      ctx.fillStyle = "#333333";
      ctx.fill();

      mat3.fromRotation(mat, vehicle.gWheelA);
      for (const wheel of [fl, fr]) {
        ctx.beginPath();
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [-15, -5], mat));
        ctx.moveTo(x, y);
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [-15, 5], mat));
        ctx.lineTo(x, y);
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [15, 5], mat));
        ctx.lineTo(x, y);
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [15, -5], mat));
        ctx.lineTo(x, y);
        ctx.fillStyle = "#000000";
        ctx.fill();
      }

      mat3.fromRotation(mat, vehicle.gCarA);
      for (const wheel of [rl, rr]) {
        ctx.beginPath();
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [-15, -5], mat));
        ctx.moveTo(x, y);
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [-15, 5], mat));
        ctx.lineTo(x, y);
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [15, 5], mat));
        ctx.lineTo(x, y);
        [x, y] = vec2.add(tmp, wheel, vec2.transformMat3(tmp, [15, -5], mat));
        ctx.lineTo(x, y);
        ctx.fillStyle = "#000000";
        ctx.fill();
      }
    });
    return () => cancelAnimationFrame(rafId);
  }, [vehicle]);

  return <canvas id="root-canvas" ref={canvasRef} />;
}
