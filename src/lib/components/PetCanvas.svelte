<script lang="ts">
  // Canvas-Tier: wächst sichtbar über 7 Stufen (Ei → Leuchtwesen) und trägt gekaufte Accessoires.
  // Jede Stufe verändert Form/Merkmale deutlich. Sanfte Idle-Animation, respektiert reduce-motion.
  import { stageFor, type PetState } from "$lib/pet";
  import { settings } from "$lib/stores/settings";

  interface Props {
    pet: PetState;
    size?: number;
  }
  let { pet, size = 240 }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  const stage = $derived(stageFor(pet.xp));

  function hsl(h: number, s: number, l: number, a = 1) {
    return `hsla(${((h % 360) + 360) % 360}, ${s}%, ${l}%, ${a})`;
  }

  $effect(() => {
    const cv = canvas;
    if (!cv) return;
    const ctxRaw = cv.getContext("2d");
    if (!ctxRaw) return;
    const ctx: CanvasRenderingContext2D = ctxRaw; // non-null für verschachtelte Zeichenfunktionen

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduce = $settings.reduceMotion;
    const hue = pet.seed;
    const idx = stage.index;
    const equipped = pet.equipped ?? [];
    let raf = 0;
    const start = performance.now();

    // --- Accessoire-Rendering. Anker: cyc=Körpermitte, h=halbe Körperhöhe, eyeY=Augenhöhe. ---
    function drawAccessories(cx: number, cyc: number, w: number, h: number, eyeY: number) {
      const headTop = cyc - h; // Oberkante des Kopfes
      const neckY = cyc + h * 0.5;

      // Schal (am „Hals")
      if (equipped.includes("scarf")) {
        ctx.fillStyle = hsl(hue + 200, 70, 55);
        ctx.beginPath();
        ctx.ellipse(cx, neckY, w * 0.8, h * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(cx - w * 0.12, neckY, w * 0.24, h * 0.45);
      }
      // Brille — exakt auf Augenhöhe
      if (equipped.includes("glasses")) {
        const dx = w * 0.3;
        const rx = w * 0.22;
        const ry = Math.max(6, h * 0.16);
        ctx.fillStyle = "rgba(18,22,30,0.92)";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(cx + s * dx, eyeY, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "rgba(18,22,30,0.92)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - dx + rx * 0.7, eyeY);
        ctx.lineTo(cx + dx - rx * 0.7, eyeY);
        ctx.stroke();
      }
      // Blume seitlich oben am Kopf
      if (equipped.includes("flower")) {
        const fx = cx - w * 0.7;
        const fy = headTop + h * 0.18;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(fx + Math.cos(a) * w * 0.12, fy + Math.sin(a) * w * 0.12, w * 0.09, 0, Math.PI * 2);
          ctx.fillStyle = "#f6a6c1";
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(fx, fy, w * 0.07, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd166";
        ctx.fill();
      }
      // Ballon über dem Kopf (mit Schnur)
      if (equipped.includes("balloon")) {
        const bx = cx + w * 0.85;
        const topB = headTop - h * 0.5;
        ctx.strokeStyle = "#aab4c2";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.5, cyc);
        ctx.lineTo(bx, topB + w * 0.34);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(bx, topB, w * 0.26, w * 0.32, 0, 0, Math.PI * 2);
        ctx.fillStyle = hsl(hue + 140, 75, 60);
        ctx.fill();
      }
      // Schleife oben auf dem Kopf
      if (equipped.includes("bow")) {
        const by = headTop + h * 0.02;
        ctx.fillStyle = "#f06595";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx, by);
          ctx.lineTo(cx + s * w * 0.3, by - h * 0.16);
          ctx.lineTo(cx + s * w * 0.3, by + h * 0.16);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(cx, by, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Zylinder (sitzt auf dem Kopf, ragt nach oben)
      if (equipped.includes("hat")) {
        const brimY = headTop + h * 0.05;
        const hatH = Math.min(h * 0.7, headTop - 4); // nicht über den Canvas-Rand
        ctx.fillStyle = "#15191f";
        ctx.fillRect(cx - w * 0.62, brimY, w * 1.24, Math.max(4, h * 0.12)); // Krempe
        ctx.fillRect(cx - w * 0.36, brimY - hatH, w * 0.72, hatH); // Zylinder
        ctx.fillStyle = hsl(hue + 200, 60, 50);
        ctx.fillRect(cx - w * 0.36, brimY - h * 0.16, w * 0.72, Math.max(3, h * 0.08)); // Band
      }
      // Krone (auf dem Kopf)
      if (equipped.includes("crown")) {
        const ky = headTop + h * 0.06;
        const ch = Math.min(h * 0.4, headTop - 4);
        ctx.fillStyle = "#ffd43b";
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.42, ky);
        ctx.lineTo(cx - w * 0.42, ky - ch * 0.7);
        ctx.lineTo(cx - w * 0.2, ky - ch * 0.25);
        ctx.lineTo(cx, ky - ch);
        ctx.lineTo(cx + w * 0.2, ky - ch * 0.25);
        ctx.lineTo(cx + w * 0.42, ky - ch * 0.7);
        ctx.lineTo(cx + w * 0.42, ky);
        ctx.closePath();
        ctx.fill();
        for (const s of [-1, 0, 1]) {
          ctx.beginPath();
          ctx.arc(cx + s * w * 0.2, ky - ch * (s === 0 ? 1 : 0.7), w * 0.05, 0, Math.PI * 2);
          ctx.fillStyle = "#ff6b6b";
          ctx.fill();
        }
      }
    }

    function drawEgg(cx: number, cy: number, r: number, t: number) {
      // Leichtes Wackeln statt Wippen (das Ei „bibbert").
      const wob = reduce ? 0 : Math.sin(t * 6) * 0.04;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(wob);
      const grad = ctx.createLinearGradient(0, -r, 0, r);
      grad.addColorStop(0, "#fdf6e3");
      grad.addColorStop(1, "#e9dcc3");
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.78, r, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      // Sprenkel
      ctx.fillStyle = hsl(hue, 50, 70, 0.5);
      for (let i = 0; i < 6; i++) {
        const a = i * 1.7;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.35, Math.sin(a) * r * 0.45, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function draw(now: number) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;

      if (pet.onJourney) {
        const bob = reduce ? 0 : Math.sin(t * 2) * 4;
        ctx.font = `${size * 0.32}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🧭", cx, cy - 10 + bob);
        ctx.font = `${size * 0.1}px system-ui`;
        ctx.fillStyle = "#aab4c2";
        ctx.fillText("unterwegs …", cx, cy + size * 0.3);
        if (!reduce) raf = requestAnimationFrame(draw);
        return;
      }

      const baseR = size * 0.24 * stage.size; // kleiner → Kopf-Freiraum für Hut/Krone

      if (idx === 0) {
        drawEgg(cx, cy, baseR * 1.25, t);
        if (!reduce) raf = requestAnimationFrame(draw);
        return;
      }

      const bob = reduce ? 0 : Math.sin(t * 1.6) * (size * 0.012);
      // Körperproportion: jung = breit/rund, älter = höher/schlanker.
      const heightFactor = 0.95 + idx * 0.07;
      const bodyW = baseR;
      const bodyH = baseR * heightFactor;
      const cyc = cy + bob; // Körpermittelpunkt

      // Schatten
      ctx.beginPath();
      ctx.ellipse(cx, cy + bodyH * 0.95, bodyW * 0.7, bodyH * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fill();

      // Flügel (ab Erwachsen)
      if (idx >= 5) {
        ctx.fillStyle = hsl(hue + 40, 70, 75, 0.7);
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(cx + s * bodyW * 0.9, cy + bob, bodyW * 0.4, bodyH * 0.55, s * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Körper — Farbe wird über die Stufen kräftiger/heller
      const light = 50 + idx * 3;
      const grad = ctx.createLinearGradient(cx, cy - bodyH, cx, cy + bodyH);
      grad.addColorStop(0, hsl(hue, 65, light + 12));
      grad.addColorStop(1, hsl(hue + 18, 62, light - 6));
      ctx.beginPath();
      ctx.ellipse(cx, cy + bob, bodyW, bodyH, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Bäuchlein
      ctx.beginPath();
      ctx.ellipse(cx, cy + bob + bodyH * 0.18, bodyW * 0.6, bodyH * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = hsl(hue + 30, 70, 82);
      ctx.fill();

      // Arme (ab Kind)
      if (idx >= 3) {
        ctx.strokeStyle = hsl(hue, 60, light);
        ctx.lineWidth = size * 0.03;
        ctx.lineCap = "round";
        const wave = reduce ? 0 : Math.sin(t * 2.4) * 0.2;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * bodyW * 0.8, cy + bob + bodyH * 0.1);
          ctx.lineTo(cx + s * bodyW * 1.15, cy + bob + bodyH * (0.35 - (s > 0 ? wave : -wave)));
          ctx.stroke();
        }
      }

      // Antennen (2–4) bzw. Ohren (ab 4)
      if (idx >= 2 && idx <= 3) {
        ctx.strokeStyle = hsl(hue, 60, light);
        ctx.lineWidth = size * 0.018;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * bodyW * 0.4, cy + bob - bodyH * 0.85);
          ctx.lineTo(cx + s * bodyW * 0.62, cy + bob - bodyH * 1.15);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx + s * bodyW * 0.62, cy + bob - bodyH * 1.15, size * 0.02, 0, Math.PI * 2);
          ctx.fillStyle = "#ffb86b";
          ctx.fill();
        }
      } else if (idx >= 4) {
        ctx.fillStyle = hsl(hue, 60, light);
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(cx + s * bodyW * 0.55, cy + bob - bodyH * 0.78, bodyW * 0.22, bodyH * 0.32, s * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Augen — jung = groß, älter = etwas kleiner
      const eyeR = bodyW * (idx <= 2 ? 0.16 : 0.12);
      const eyeY = cy + bob - bodyH * 0.12;
      const eyeDx = bodyW * 0.3;
      const blink = !reduce && Math.sin(t * 1.1) > 0.96;
      for (const s of [-1, 1]) {
        if (blink) {
          ctx.strokeStyle = "#1a1f27";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + s * eyeDx - eyeR, eyeY);
          ctx.lineTo(cx + s * eyeDx + eyeR, eyeY);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(cx + s * eyeDx, eyeY, eyeR, 0, Math.PI * 2);
          ctx.fillStyle = "#1a1f27";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + s * eyeDx - eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
        }
      }

      // Wangen (jung)
      if (idx <= 3) {
        ctx.fillStyle = "rgba(255,120,140,0.4)";
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(cx + s * bodyW * 0.45, eyeY + bodyH * 0.16, bodyW * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Lächeln
      ctx.beginPath();
      ctx.arc(cx, eyeY + bodyH * 0.2, bodyW * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = "#1a1f27";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();

      // Leucht-Aura + Funkeln (höchste Stufe)
      if (idx >= 6) {
        ctx.beginPath();
        ctx.arc(cx, cy + bob, bodyW * 1.3, 0, Math.PI * 2);
        ctx.strokeStyle = hsl(hue + 40, 90, 70, 0.3 + 0.2 * Math.sin(t * 2));
        ctx.lineWidth = 3;
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const a = t * 0.6 + i * 1.3;
          const rr = bodyW * (1.1 + 0.15 * Math.sin(t * 2 + i));
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * rr, cy + bob + Math.sin(a) * rr, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = hsl(hue + 60, 90, 80);
          ctx.fill();
        }
      }

      // Accessoires zuletzt (über allem), mit korrekten Ankern.
      drawAccessories(cx, cyc, bodyW, bodyH, eyeY);

      if (!reduce) raf = requestAnimationFrame(draw);
    }

    draw(performance.now());
    return () => cancelAnimationFrame(raf);
  });
</script>

<canvas
  bind:this={canvas}
  style="width:{size}px;height:{size}px"
  class="select-none"
  aria-label="Familien-Tier {pet.name}, Stufe {stage.title}"
></canvas>
