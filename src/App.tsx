import { mat3, vec2 } from "gl-matrix";
import { useLayoutEffect, useRef, useState } from "react";

declare module "react" {
  interface CSSProperties {
    [key: `--${string}`]: string | number;
  }
}

const clamp = (x = 0, min = 0, max = 1) => Math.min(Math.max(x, min), max);

const frict = 0.1;
const maxV = 5;
const maxWheel = Math.PI / 4;

export default function App() {
  const [vehicle, setVehicle] = useState({
    x: 500,
    y: 100,
    speed: 0,
    rotation: 0,
    width: 65,
    length: 100,
    wheel: 0.5236,
    steering: "" as "" | "pointer" | "key",
    pressedKeys: {} as Record<string, unknown>,
    trailer: { x: 370, y: 100, length: 323, rotation: 0 },
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

    const onPointerDown = (e: PointerEvent) => {
      const { pointerId } = e;
      setVehicle((prev) => ({ ...prev, steering: "pointer" }));

      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const delta =
          (2 * maxWheel * (e.movementX * devicePixelRatio)) / screen.width;
        setVehicle((prev) => ({ ...prev, wheel: prev.wheel + delta }));
      };
      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
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

        let { speed } = prev;
        if (speed < 0) speed = clamp(speed + accel + frict, -maxV, 0);
        else if (speed > 0) speed = clamp(speed + accel - frict, 0, maxV);
        else if (accel) speed = clamp(speed + accel - frict, -maxV, maxV);

        let deltaWheel = 0;
        let { steering } = prev;
        if (steering !== "pointer") {
          const restoreTorque = -0.01 * Math.abs(speed) * Math.sin(prev.wheel);
          deltaWheel = Math.asin(restoreTorque);
          steering = "key";
          if (prev.pressedKeys["KeyA"]) deltaWheel += -0.02;
          else if (prev.pressedKeys["KeyD"]) deltaWheel += 0.02;
          else steering = "";
        }

        const vSpeed = vec2.fromValues(speed, 0);
        vec2.rotate(vSpeed, vSpeed, [0, 0], prev.rotation + prev.wheel);
        const x = prev.x + vSpeed[0];
        const y = prev.y + vSpeed[1];

        const wheel = clamp(prev.wheel + deltaWheel, -maxWheel, maxWheel);
        const torque = (speed / prev.length) * Math.sin(prev.wheel);
        const rotation = prev.rotation + Math.asin(torque);

        const { trailer: trailer0 } = prev;
        const tXY = vec2.rotate(
          vec2.create(),
          [-prev.length, 0],
          [0, 0],
          rotation,
        );
        const tTorque =
          (speed / trailer0.length) *
          Math.sin(prev.rotation - trailer0.rotation);
        const trailer = {
          ...trailer0,
          x: x + tXY[0],
          y: y + tXY[1],
          rotation: trailer0.rotation + Math.asin(tTorque),
        };
        return { ...prev, x, y, speed, rotation, wheel, steering, trailer };
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

      const wheel = vehicle.wheel;
      const wx = center + 240 * (1 + wheel / maxWheel);
      ctx.beginPath();
      ctx.ellipse(wx, 22, 12, 12, 0, 0, 2 * Math.PI);

      ctx.fillStyle = vehicle.steering ? "#e00000" : "#400000";
      ctx.fill();

      const tmp: vec2 = [0, 0];
      const pos: vec2 = [vehicle.x, vehicle.y];
      const mat = mat3.fromTranslation(mat3.create(), pos);
      mat3.rotate(mat, mat, vehicle.rotation);

      const fl: vec2 = [0, -vehicle.width / 2];
      const fr: vec2 = [0, vehicle.width / 2];
      const rl: vec2 = [-vehicle.length, vehicle.width / 2];
      const rr: vec2 = [-vehicle.length, -vehicle.width / 2];
      vec2.transformMat3(fl, fl, mat);
      vec2.transformMat3(fr, fr, mat);
      vec2.transformMat3(rl, rl, mat);
      vec2.transformMat3(rr, rr, mat);

      mat3.fromRotation(mat, vehicle.rotation);
      ctx.beginPath();
      let [x, y] = vec2.add(tmp, fl, vec2.transformMat3(tmp, [15, -5], mat));
      ctx.moveTo(x, y);
      [x, y] = vec2.add(tmp, fr, vec2.transformMat3(tmp, [15, 5], mat));
      ctx.lineTo(x, y);
      [x, y] = vec2.add(tmp, rl, vec2.transformMat3(tmp, [-15, 5], mat));
      ctx.lineTo(x, y);
      [x, y] = vec2.add(tmp, rr, vec2.transformMat3(tmp, [-15, -5], mat));
      ctx.lineTo(x, y);
      ctx.fillStyle = "#000000cc";
      ctx.fill();

      // trailer
      const { trailer } = vehicle;
      mat3.fromTranslation(mat, [trailer.x, trailer.y]);
      mat3.rotate(mat, mat, trailer.rotation);
      const tfl: vec2 = [15, -5 - vehicle.width / 2];
      const tfr: vec2 = [15, 5 + vehicle.width / 2];
      const trl: vec2 = [-15 - trailer.length, 5 + vehicle.width / 2];
      const trr: vec2 = [-15 - trailer.length, -5 - vehicle.width / 2];
      ctx.beginPath();
      [x, y] = vec2.transformMat3(tfl, tfl, mat);
      ctx.moveTo(x, y);
      [x, y] = vec2.transformMat3(tfr, tfr, mat);
      ctx.lineTo(x, y);
      [x, y] = vec2.transformMat3(trl, trl, mat);
      ctx.lineTo(x, y);
      [x, y] = vec2.transformMat3(trr, trr, mat);
      ctx.lineTo(x, y);
      ctx.fillStyle = "#000000cc";
      ctx.fill();

      mat3.fromRotation(mat, vehicle.rotation + vehicle.wheel);
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

      mat3.fromRotation(mat, vehicle.rotation);
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
