/**
 * Counting Fun — Number Matching Game
 * A joyful counting game for little ones.
 *
 * Gameplay:
 *   - A big friendly number card (1-5) floats at the top of the screen
 *   - Below it, a group of cute 3D objects (apples, stars, balls,
 *     ducks, hearts) bob and spin on the ground
 *   - Tap the correct object to answer
 *
 * How it works:
 *   - Three little "families" of objects (apples, stars, balls, ducks,
 *     hearts) sit on a sunny playground, each a different color
 *   - Each family has a DIFFERENT number of members (1-5)
 *   - The child counts each family and taps the one that matches the
 *     number on the card
 *   - Tapping the right family grows it big and glowing, then it zooms
 *     up to meet the number card in a happy celebration
 *   - Wrong taps get a gentle wobble and a soft sound — no penalties,
 *     just keep trying!
 *   - After 5 rounds of praise, a starry confetti finale plays
 *
 * Architecture:
 *   - Extends BaseGame (scene, camera, renderer, loop, cleanup)
 *   - Three.js sprites for number/emoji UI (no DOM overlays needed)
 *   - CanvasTexture for crisp, bold, kid-friendly text
 */

class CountingFunGame extends BaseGame {
    constructor(container) {
        super(container);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // --- Game state ---
        this.objects = [];          // tappable 3D objects (Group each)
        this.objectGeo = [];        // shared geometries (disposed once)
        this.targetCount = 0;       // the number to count
        this.answer = null;         // the correct object's group
        this.busy = false;          // animation lock (ignores taps)
        this.round = 0;             // current round number (1-based)
        this.score = 0;             // rounds completed so far
        this.maxRounds = 5;

        // UI
        this.hud = null;            // HUD group (spans + banner + star count)
        this.numSprite = null;
        this.numSpriteMat = null;
        this.bannerSprite = null;
        this.bannerSpriteMat = null;
        this.starSprites = [];
    }

    // ==========================================
    // Palette — shared by card colors, ground, objects
    // ==========================================

    get PALETTE() {
        return [
            { hex: 0xFF6B6B, name: 'apple'  },
            { hex: 0xFFA94D, name: 'star'   },
            { hex: 0xFFD43B, name: 'ball'   },
            { hex: 0x69DB7C, name: 'duck'   },
            { hex: 0x38D9A9, name: 'heart'  }
        ];
    }

    // ==========================================
    // Game Init
    // ==========================================

    gameInit() {
        // Warm, friendly sky (counting is a happy mood, not a dark one)
        this.scene.background = new THREE.Color(0x4d6bfa);

        // Position the camera so the whole playground fits — on a narrow
        // (portrait) screen this pulls the camera back so no family is cut off.
        this._fitCamera();

        this._setupSun();
        this._setupClouds();
        this._setupGround();
        this._setupHud();

        this._newRound();

        setTimeout(() => SoundManager.play('sparkle'), 600);
    }

    /**
     * Where the three families sit. On a wide (landscape) screen they form a
     * shallow triangle side-by-side; on a narrow (portrait) screen they are
     * stacked in depth so they read as a clean vertical column and nothing
     * is cut off at the edges.
     * @returns {{x:number, z:number, s:number}[]}
     */
    _familySlots() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        if ((w / h) >= 1.0) {
            return [
                { x: -2.8, z: -0.6, s: 0.62 },
                { x: 2.8,  z: 0.2,  s: 0.62 },
                { x: 0,    z: 2.6,  s: 0.55 }
            ];
        }
        // Portrait: a narrower, smaller triangle that fits the width
        return [
            { x: -1.7, z: -0.6, s: 0.52 },
            { x: 1.7,  z: 0.2,  s: 0.52 },
            { x: 0,    z: 2.2,  s: 0.47 }
        ];
    }

    /**
     * Frame the whole playground for the current aspect ratio so every object
     * stays on screen and can be counted.
     */
    _fitCamera() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        const aspect = Math.max(0.4, w / h);
        const tanHalfFov = Math.tan(Helpers.degToRad(60) / 2);

        if (aspect >= 1.0) {
            // Landscape: families sit side-by-side at x = ±2.9; a 5-item
            // family reaches ~x = ±3.8. Pull back until that full width fits.
            const halfWidth = 4.5;
            const z = Math.max(9.5, halfWidth / (tanHalfFov * aspect));
            this.camera.position.set(0, 3.2, z);
            this.camera.lookAt(0, 1, 0);
            this.scene.fog = new THREE.Fog(0x4d6bfa, z + 6, z + 40);
            return;
        }

        // Portrait: families are stacked in depth (z = -3.0 .. 3.2). Frame
        // that depth range from a higher, slightly back camera.
        const z = Math.max(10.5, 3.5 / (tanHalfFov * aspect));
        this.camera.position.set(0, 4.0, z);
        this.camera.lookAt(0, 0, 0.4);
        this.scene.fog = new THREE.Fog(0x4d6bfa, z + 8, z + 40);
    }

    /** Re-frame on resize (rotating a phone, changing window size). */
    _onResize() {
        super._onResize();
        this._fitCamera();
    }

    /** Soft glowing sun behind the number card. */
    _setupSun() {
        const sunGeo = new THREE.SphereGeometry(1.6, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFE08A });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(0, 3.5, -6);
        this.addGameObject(sun);
        sun.userData.decor = true;
        sun.userData.sun = true;

        const glowGeo = new THREE.SphereGeometry(2.3, 32, 32);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFFE08A, transparent: true, opacity: 0.25
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(sun.position);
        this.addGameObject(glow);
        glow.userData.decor = true;
        glow.userData.sun = true;
    }

    /** Two slowly drifting puffy clouds. */
    _setupClouds() {
        const cloudMat = new THREE.MeshPhongMaterial({
            color: 0xffffff, transparent: true, opacity: 0.9,
            shininess: 20
        });

        const makeCloud = (x, y, z, scale, speed, offset) => {
            const cloud = new THREE.Group();
            const puffs = [
                [0, 0, 0, 0.55],
                [0.55, 0.05, 0, 0.4],
                [-0.5, 0.05, 0, 0.42],
                [0.25, 0.3, 0, 0.35],
                [-0.25, 0.28, 0, 0.33]
            ];
            puffs.forEach(p => {
                const m = new THREE.Mesh(new THREE.SphereGeometry(p[3], 20, 20), cloudMat);
                m.position.set(p[0], p[1], p[2]);
                cloud.add(m);
            });
            cloud.position.set(x, y, z);
            cloud.scale.setScalar(scale);
            cloud.userData.decor = true;
            cloud.userData.cloud = true;
            cloud.userData.cloudSpeed = speed;
            cloud.userData.cloudOffset = offset;
            cloud.userData.baseX = x;
            this.addGameObject(cloud);
        };

        makeCloud(-5.5, 4.5, -4, 1.0, 0.07, 0);
        makeCloud(5.0, 5.0, -5, 1.2, 0.055, 2.1);
    }

    /** Big rounded green ground with a soft darker circle in the middle. */
    _setupGround() {
        const groundGeo = new THREE.CircleGeometry(11, 48);
        const groundMat = new THREE.MeshPhongMaterial({ color: 0x58c48e, shininess: 15 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.75;
        ground.receiveShadow = true;
        this.addGameObject(ground);
        ground.userData.decor = true;

        const ringGeo = new THREE.CircleGeometry(4.6, 48);
        const ringMat = new THREE.MeshPhongMaterial({
            color: 0x48b57e, transparent: true, opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.74;
        this.addGameObject(ring);
        ring.userData.decor = true;
    }

    /** HUD: number card, praise banner, star row. All Three.js sprites. */
    _setupHud() {
        this.hud = new THREE.Group();
        this.scene.add(this.hud);

        // --- Number card (drawn every round via _setNumber) ---
        this._numCanvas = document.createElement('canvas');
        this._numCanvas.width = 256;
        this._numCanvas.height = 256;
        this._numCtx = this._numCanvas.getContext('2d');
        this.numSpriteMat = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(this._numCanvas),
            depthTest: false,
            depthWrite: false
        });
        this.numSprite = new THREE.Sprite(this.numSpriteMat);
        this.numSprite.scale.set(2.1, 2.1, 1);
        this.numSprite.position.set(0, 3.7, -1);
        this.hud.add(this.numSprite);

        // --- Praise banner (hidden by default) ---
        this._bannerCanvas = document.createElement('canvas');
        this._bannerCanvas.width = 512;
        this._bannerCanvas.height = 160;
        this._bannerCtx = this._bannerCanvas.getContext('2d');
        this.bannerSpriteMat = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(this._bannerCanvas),
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false
        });
        this.bannerSprite = new THREE.Sprite(this.bannerSpriteMat);
        this.bannerSprite.scale.set(4.6, 1.44, 1);
        this.bannerSprite.position.set(0, 2.55, -0.5);
        this.hud.add(this.bannerSprite);

        // --- Star row (marks completed rounds) ---
        // Drawn with vector paths (not an emoji) so it looks identical
        // on every device, no matter what fonts are installed.
        this._starCanvas = document.createElement('canvas');
        this._starCanvas.width = 128;
        this._starCanvas.height = 128;
        const sctx = this._starCanvas.getContext('2d');
        const cx = 64, cy = 70, outer = 54, inner = 24;
        sctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            if (i === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
        }
        sctx.closePath();
        sctx.fillStyle = '#FFD43B';
        sctx.strokeStyle = '#ffffff';
        sctx.lineWidth = 6;
        sctx.fill();
        sctx.stroke();
        const starTex = new THREE.CanvasTexture(this._starCanvas);
        this._starTex = starTex;

        for (let i = 0; i < this.maxRounds; i++) {
            const mat = new THREE.SpriteMaterial({
                map: starTex,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false
            });
            const s = new THREE.Sprite(mat);
            s.scale.set(0.55, 0.55, 1);
            s.position.set((i - (this.maxRounds - 1) / 2) * 0.72, 5.35, 0);
            this.hud.add(s);
            this.starSprites.push(s);
        }
    }

    /** Draw the number card + glow ring on its canvas. */
    _setNumber(n) {
        const c = this._numCtx;
        c.clearRect(0, 0, 256, 256);

        // Glow ring
        c.beginPath();
        c.arc(128, 128, 118, 0, Math.PI * 2);
        c.fillStyle = 'rgba(255, 255, 255, 0.22)';
        c.fill();

        // Card
        c.beginPath();
        c.arc(128, 128, 104, 0, Math.PI * 2);
        c.fillStyle = '#ffffff';
        c.fill();
        c.lineWidth = 10;
        c.strokeStyle = '#FFD43B';
        c.stroke();

        // Number
        c.fillStyle = '#364fc7';
        c.font = 'bold 130px "Comic Sans MS", "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(n), 128, 134);

        this.numSpriteMat.map.needsUpdate = true;
    }

    /** Draw a praise message on the banner canvas. */
    _setBanner(text) {
        const c = this._bannerCtx;
        c.clearRect(0, 0, 512, 160);

        c.font = 'bold 72px "Comic Sans MS", "Segoe UI", sans-serif';
        const w = c.measureText(text).width;
        const pad = 60;
        const rw = Math.min(w + pad * 2, 496);

        // Rounded pill
        const x = (512 - rw) / 2;
        const y = 18;
        const h = 124;
        const r = h / 2;
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + rw, y, x + rw, y + h, r);
        c.arcTo(x + rw, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + rw, y, r);
        c.closePath();
        c.fillStyle = 'rgba(255, 255, 255, 0.95)';
        c.fill();

        c.fillStyle = '#364fc7';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, 256, 84);

        this.bannerSpriteMat.map.needsUpdate = true;
    }

    // ==========================================
    // Rounds
    // ==========================================

    _newRound() {
        this.round++;
        this.busy = false;
        this.answer = null;

        // Pick a number (1-5), different from the last round
        if (this.round > 1) {
            const options = [1, 2, 3, 4, 5].filter(x => x !== this.targetCount);
            this.targetCount = Helpers.pick(options);
        } else {
            this.targetCount = Helpers.randomInt(1, 5);
        }
        this._setNumber(this.targetCount);

        this._clearObjects();
        this._spawnRoundObjects(this.targetCount);

        // Let any previous praise banner fade out
        this.bannerSpriteMat._targetOpacity = 0;
    }

    /** Remove and dispose all round objects (shared geo kept).
     *  Confetti pieces are left alone — _updateConfetti retires them. */
    _clearObjects() {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const g = this.objects[i];
            if (g.userData.confetti) continue;
            this.removeGameObject(g);
            g.traverse(child => {
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this.objects.splice(i, 1);
        }
        this.answer = null;
    }

    /**
     * Spawn the round's objects:
     *   - 3 groups at separate spots, each a different color & shape
     *   - each group has a DIFFERENT count (one of them is exactly N)
     *   - the child taps the group whose count matches the number card
     */
    _spawnRoundObjects(n) {
        // Target count + two distractor counts, all different
        const distractors = Helpers.shuffle([1, 2, 3, 4, 5].filter(x => x !== n)).slice(0, 2);
        const counts = Helpers.shuffle([n, ...distractors]);

        const colors = Helpers.shuffle([...this.PALETTE]).slice(0, 3);

        const slots = this._familySlots();

        const groups = [];
        for (let i = 0; i < 3; i++) {
            groups.push(this._makeGroup(colors[i].hex, slots[i], counts[i]));
        }

        // The answer is the group with exactly n items (counts are unique,
        // so exactly one group qualifies)
        this.answer = groups.find(g => g.userData.itemCount === n);

        for (const g of groups) {
            g.userData.isAnswer = (g === this.answer);
            g.userData.hlPhase = 0; // highlight pulse timer
            g.userData.launched = false;
            g.userData.launch = null;
            g.userData.dead = false;
            g.userData.spinSpeed = Helpers.random(0.4, 0.8);
            g.userData.baseX = g.position.x;
            g.userData.baseY = g.position.y;
            g.userData.slotScale = g.scale.x;
            this.addGameObject(g);
            this.objects.push(g);
        }
    }

    /**
     * Build one group of `count` objects of one color on a spot.
     * Returns a THREE.Group; shapes are chosen per color for variety.
     */
    _makeGroup(colorHex, slot, count) {
        const group = new THREE.Group();
        group.position.set(slot.x, -0.15, slot.z);
        group.scale.setScalar(slot.s);
        group.userData.itemCount = count;

        const emoji = this._emojiFor(colorHex);
        const shapeName = this._shapeFor(colorHex);
        const color = new THREE.Color(colorHex);

        // Fixed, clearly-spaced positions per count so each object is its
        // own distinct thing — easy for a little one to count.
        const layout = this._familyLayout(count);

        for (let i = 0; i < count; i++) {
            const obj = this._makeItem(shapeName, color, emoji);
            obj.position.set(layout[i][0], 0, layout[i][1]);
            obj.rotation.y = Math.random() * Math.PI * 2;
            obj.userData.floatOffset = Math.random() * Math.PI * 2;
            obj.userData.floatAmplitude = 0.1;
            obj.userData.floatSpeed = Helpers.random(0.8, 1.4);
            obj.userData.baseY = 0;
            group.add(obj);
        }

        return group;
    }

    /**
     * Local (x, z) positions for a family of `count` items.
     * 1-3 use a row, 4 a 2x2 grid, 5 a staggered 3+2 — every item is
     * well separated so a little one can count each one individually.
     * @param {number} count
     * @returns {number[][]}
     */
    _familyLayout(count) {
        switch (count) {
            case 1:  return [[0, 0]];
            case 2:  return [[-0.9, 0], [0.9, 0]];
            case 3:  return [[-1.8, 0], [0, 0], [1.8, 0]];
            case 4:  return [[-0.95, -1.0], [0.95, -1.0], [-0.95, 1.0], [0.95, 1.0]];
            case 5:  return [[-1.8, -1.25], [0, -1.25], [1.8, -1.25], [-0.9, 1.25], [0.9, 1.25]];
            default: return [[0, 0]];
        }
    }

    _shapeFor(colorHex) {
        switch (colorHex) {
            case 0xFF6B6B: return 'apple';
            case 0xFFA94D: return 'star';
            case 0xFFD43B: return 'ball';
            case 0x69DB7C: return 'duck';
            case 0x38D9A9: return 'heart';
            default: return 'ball';
        }
    }

    _emojiFor(colorHex) {
        switch (colorHex) {
            case 0xFF6B6B: return '\u{1F34E}'; // red apple
            case 0xFFA94D: return '\u{2B50}';  // star
            case 0xFFD43B: return '\u{1F3BE}'; // orange (ball)
            case 0x69DB7C: return '\u{1F426}'; // duck
            case 0x38D9A9: return '\u{1F497}'; // heart
            default: return '\u{1F9E0}';
        }
    }

    /**
     * One object: base shape (per color) + an emoji sprite on top.
     * Geometry is shared across all items of a type; materials are not.
     */
    _makeItem(shapeName, color, emoji) {
        let geo;
        switch (shapeName) {
            case 'apple':
                geo = new THREE.SphereGeometry(0.42, 24, 24);
                break;
            case 'star':
                geo = new THREE.OctahedronGeometry(0.48, 0);
                break;
            case 'ball':
                geo = new THREE.SphereGeometry(0.42, 24, 24);
                break;
            case 'duck':
                geo = new THREE.ConeGeometry(0.45, 0.8, 8);
                break;
            case 'heart':
                geo = new THREE.TorusKnotGeometry(0.32, 0.13, 48, 10);
                break;
            default:
                geo = new THREE.SphereGeometry(0.42, 24, 24);
        }

        const key = shapeName;
        if (!this.objectGeo[key]) this.objectGeo[key] = geo;
        geo = this.objectGeo[key];

        const mat = new THREE.MeshPhongMaterial({
            color: color.clone(),
            shininess: 80,
            emissive: color.clone().multiplyScalar(0.08)
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;

        // Offset per shape so the emoji sits nicely on top
        const topY = shapeName === 'duck' ? 0.85 : 1.0;
        const sprite = this._makeEmojiSprite(emoji, 0.62);
        sprite.position.y = topY;

        const item = new THREE.Group();
        item.add(mesh);
        item.add(sprite);
        return item;
    }

    /** Emoji sprite from a canvas texture. */
    _makeEmojiSprite(emoji, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const c = canvas.getContext('2d');
        c.font = '96px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(emoji, 64, 70);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(scale);
        return sprite;
    }

    // ==========================================
    // Per-Frame Update
    // ==========================================

    update(delta, elapsed) {
        // Decorations: sun pulse + drifting clouds
        this.gameObjects.forEach(obj => {
            if (obj.userData.decor) {
                if (obj.userData.sun) {
                    obj.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.04);
                }
                if (obj.userData.cloud) {
                    obj.position.x = obj.userData.baseX +
                        Math.sin(elapsed * obj.userData.cloudSpeed + obj.userData.cloudOffset) * 2.5;
                }
            }
        });

        // HUD: number card bobs gently
        if (this.numSprite) {
            this.numSprite.position.y = 3.7 + Math.sin(elapsed * 1.2) * 0.12;
        }

        // Banner: fade + float
        if (this.bannerSprite) {
            const target = this.bannerSpriteMat._targetOpacity !== undefined ? this.bannerSpriteMat._targetOpacity : 0;
            this.bannerSpriteMat.opacity = Helpers.lerp(this.bannerSpriteMat.opacity, target, Math.min(1, delta * 4));
            if (this.bannerSpriteMat.opacity > 0.05) {
                this.bannerSprite.position.y = 2.55 + Math.sin(elapsed * 2) * 0.08;
            }
        }

        // Star row twinkle (lit stars = rounds completed so far)
        this.starSprites.forEach((s, i) => {
            const lit = i < this.score;
            const base = lit ? 1.0 : 0.3;
            s.material.opacity = base * (0.85 + 0.15 * Math.sin(elapsed * 3 + i));
        });

        // Objects: float + spin
        for (const g of this.objects) {
            if (g.userData.dead) continue;

            // Spin each item
            g.children.forEach(child => {
                child.rotation.y += delta * g.userData.spinSpeed;
            });
            // Items bob
            g.children.forEach(child => {
                if (child.userData && child.userData.floatAmplitude !== undefined) {
                    this.applyFloat(child, elapsed);
                }
            });

            // Answer group pulses to invite a tap
            if (g.userData.isAnswer && !g.userData.launched) {
                g.userData.hlPhase += delta;
                const pulse = 1 + Math.sin(g.userData.hlPhase * 3.5) * 0.045;
                g.scale.setScalar(this._slotScale(g) * pulse);
            }

            // Launch animation (zoom up to the card)
            if (g.userData.launched) {
                const L = g.userData.launch;
                L.t += delta;
                const p = Helpers.clamp(L.t / L.dur, 0, 1);
                const e = p * p * (3 - 2 * p); // smoothstep
                g.position.x = Helpers.lerp(L.from.x, L.to.x, e);
                g.position.y = Helpers.lerp(L.from.y, L.to.y, e);
                g.position.z = Helpers.lerp(L.from.z, L.to.z, e);
                const grow = 1 + Math.sin(p * Math.PI) * 0.9;
                g.scale.setScalar(L.fromScale * grow * (1 - e * 0.55));
                g.rotation.y += delta * 4;
            }
        }

        // Spawned confetti pieces (in this.objects but flagged)
        this._updateConfetti(delta);
    }

    _slotScale(group) {
        return group.userData.slotScale !== undefined ? group.userData.slotScale : 0.6;
    }

    _spawnConfetti() {
        for (let i = 0; i < 40; i++) {
            const size = Helpers.random(0.08, 0.22);
            const geo = i % 2 === 0
                ? new THREE.BoxGeometry(size, size, size)
                : new THREE.SphereGeometry(size / 2, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6)
            });
            const piece = new THREE.Mesh(geo, mat);
            piece.position.set(Helpers.random(-6, 6), Helpers.random(4, 7), Helpers.random(-3, 2));
            piece.userData.confetti = true;
            piece.userData.dead = false;
            piece.userData.vel = new THREE.Vector3(
                Helpers.random(-0.5, 0.5),
                -Helpers.random(1.5, 3),
                Helpers.random(-0.5, 0.5)
            );
            piece.userData.rotSpeed = Helpers.random(2, 6);
            this.scene.add(piece);
            this.objects.push(piece);
        }
    }

    _updateConfetti(delta) {
        for (const p of this.objects) {
            if (!p.userData.confetti) continue;
            p.position.addScaledVector(p.userData.vel, delta);
            p.rotation.x += delta * p.userData.rotSpeed;
            p.rotation.y += delta * p.userData.rotSpeed * 0.7;
            if (p.position.y < -1) p.userData.dead = true;
        }
        // Remove dead confetti
        for (let i = this.objects.length - 1; i >= 0; i--) {
            if (this.objects[i].userData.confetti && this.objects[i].userData.dead) {
                this.removeGameObject(this.objects[i]);
                this.objects[i].geometry.dispose();
                this.objects[i].material.dispose();
                this.objects.splice(i, 1);
            }
        }
    }

    // ==========================================
    // Interaction
    // ==========================================

    onClick(event) {
        if (this.busy) return;

        // Use the container's rect so NDC is correct even in a sub-view
        const rect = this.renderer.domElement.getBoundingClientRect();
        const cx = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
        const cy = (event.touches && event.touches[0]) ? event.touches[0].clientY : event.clientY;
        this.mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.objects, true);
        if (hits.length === 0) return;

        // Walk up to the top-level group in this.objects
        let obj = hits[0].object;
        while (obj.parent && this.objects.indexOf(obj) === -1) obj = obj.parent;
        if (this.objects.indexOf(obj) === -1) return;

        this._onObjectTap(obj);
    }

    _onObjectTap(obj) {
        if (obj.userData.launched || obj.userData.confetti) return;

        if (obj === this.answer) {
            this._onCorrect(obj);
        } else {
            this._onWrong(obj);
        }
    }

    _onCorrect(obj) {
        this.busy = true;
        this.score++;
        SoundManager.play('success');

        // Praise!
        const praises = ['Great job!', 'You found it!', 'Amazing!', 'Wow!', 'Super!'];
        this._setBanner(Helpers.pick(praises));
        this.bannerSpriteMat._targetOpacity = 1;

        // Light up the star for this round
        if (this.starSprites[this.round - 1]) {
            this.starSprites[this.round - 1].material.opacity = 1;
        }

        // Launch the answer toward the number card
        obj.userData.launched = true;
        obj.userData.launch = {
            from: obj.position.clone(),
            to: new THREE.Vector3(0, 3.4, -1),
            fromScale: this._slotScale(obj),
            t: 0,
            dur: 0.9
        };

        // Dim the non-answer objects
        this.objects.forEach(o => {
            if (o !== obj && !o.userData.confetti && !o.userData.dead) {
                o.traverse(child => {
                    if (child.material) {
                        child.material.transparent = true;
                        child.material.opacity = 0.35;
                    }
                });
            }
        });

        setTimeout(() => SoundManager.play('sparkle'), 450);
        setTimeout(() => {
            if (!this.isRunning) return; // game was left
            if (this.round >= this.maxRounds) {
                this._gameOver();
            } else {
                this._newRound();
            }
        }, 1400);
    }

    _onWrong(obj) {
        SoundManager.play('error');
        Helpers.showToast('Almost! Try again \u{1F914}', 1600);

        // Gentle wobble (250ms)
        const baseScale = this._slotScale(obj);
        let t = 0;
        const tick = () => {
            t += 16;
            if (t >= 250 || !this.isRunning) {
                obj.scale.setScalar(baseScale);
                return;
            }
            const wobble = 1 + Math.sin((t / 250) * Math.PI * 3) * 0.06 * (1 - t / 250);
            obj.scale.setScalar(baseScale * wobble);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    _gameOver() {
        this.finished = true; // flag (kept separate from the _gameOver() method)
        this.busy = true;
        this._spawnConfetti();
        this._setBanner('Yay! \u{1F389} \u{1F31F}\u{1F31F}\u{1F31F}\u{1F31F}\u{1F31F}');
        this.bannerSpriteMat._targetOpacity = 1;
        SoundManager.play('success');
        setTimeout(() => SoundManager.play('sparkle'), 300);
        setTimeout(() => SoundManager.play('sparkle'), 650);

        // Clear objects shortly after the celebration
        setTimeout(() => {
            if (!this.isRunning) return;
            this._clearObjects();
        }, 2500);

        // Keep confetti falling in the background
        this._confettiTimer = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(this._confettiTimer);
                return;
            }
            this._spawnConfetti();
        }, 1800);
    }

    // ==========================================
    // Cleanup
    // ==========================================

    dispose() {
        if (this._confettiTimer) {
            clearInterval(this._confettiTimer);
            this._confettiTimer = null;
        }
        // Dispose any textures still held by scene objects (material.map is
        // not handled by BaseGame.dispose)
        if (this.scene) {
            this.scene.traverse(child => {
                if (child.material && child.material.map) child.material.map.dispose();
            });
        }
        this.objects = [];
        super.dispose();

        // Shared geometries (removed from the scene earlier, so dispose now)
        this.objectGeo.forEach(geo => { if (geo) geo.dispose(); });
        this.objectGeo = [];

        // HUD canvas textures (material.map isn't disposed by BaseGame)
        if (this.numSpriteMat && this.numSpriteMat.map) this.numSpriteMat.map.dispose();
        if (this.bannerSpriteMat && this.bannerSpriteMat.map) this.bannerSpriteMat.map.dispose();
        if (this._starTex) this._starTex.dispose();
    }
}

// Register with the game manager
// GAMES[1] is the "counting-fun" entry (index 1)
if (typeof GAMES !== 'undefined') {
    GAMES[1].gameClass = CountingFunGame;
}
