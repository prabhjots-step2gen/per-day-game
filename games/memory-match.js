/**
 * Memory Match - Card Flipping Pair Game
 * A gentle memory game for little ones.
 *
 * Gameplay:
 *   - A 2x4 grid of face-down cards floats in front of a soft sky
 *   - Each pair of cards hides the SAME cute emoji (4 pairs = 8 cards)
 *   - Tap a card to flip it and see the emoji
 *   - Tap a second card: if the two match, both stay open with a
 *     cheerful "match!" and a star lights up
 *   - If they don't match, they politely flip back - no penalties,
 *     just try again!
 *   - Find all 4 pairs and a starry confetti finale plays
 *
 * How it works (forgiving design, no penalties):
 *   - 4 distinct emojis are chosen each play, each appearing twice
 *   - Cards are shuffled, so the order is different every time
 *   - Wrong pairs simply flip back after a short pause
 *
 * Architecture:
 *   - Extends BaseGame (scene, camera, renderer, loop, cleanup)
 *   - Cards are 3D groups: a colored plate + a "?" back + an emoji face
 *   - Flipping is a horizontal scale tween (1 -> 0 -> 1) with a face
 *     swap at the edge, so it reads as a card turn without full rotation
 */

class MemoryMatchGame extends BaseGame {
    constructor(container) {
        super(container);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // --- Game state ---
        this.cards = [];            // tappable card groups
        this.firstPicked = null;    // the first card flipped up (not yet matched)
        this.busy = false;          // animation lock (ignores taps)
        this.matchedPairs = 0;      // pairs found so far
        this.maxPairs = 4;          // 4 pairs = 8 cards
        this.finished = false;      // true once every pair is found

        // Shared geometry (disposed once)
        this.cardGeo = {};

        // UI
        this.hud = null;
        this.bannerSprite = null;
        this.bannerSpriteMat = null;
        this.titleSprite = null;
        this.titleSpriteMat = null;
        this.starSprites = [];
        this.gridGroup = null;
    }

    // ==========================================
    // Emoji Pool - enough distinct faces to pick 4 per play
    // ==========================================

    get POOL() {
        return [
            { emoji: '\u{1F34E}', name: 'Apple' },
            { emoji: '\u{1F431}', name: 'Cat' },
            { emoji: '\u2B50',     name: 'Star' },
            { emoji: '\u{1F388}', name: 'Balloon' },
            { emoji: '\u{1F436}', name: 'Dog' },
            { emoji: '\u{1F98B}', name: 'Butterfly' },
            { emoji: '\u{1F369}', name: 'Donut' },
            { emoji: '\u{1F308}', name: 'Rainbow' },
            { emoji: '\u{1F41F}', name: 'Fish' },
            { emoji: '\u{1F9F7}', name: 'Bear' },
            { emoji: '\u{1F353}', name: 'Strawberry' },
            { emoji: '\u{1F697}', name: 'Car' }
        ];
    }

    // ==========================================
    // Game Init
    // ==========================================

    gameInit() {
        // Calm, dreamy sky so the cards pop
        this.scene.background = new THREE.Color(0x7ec8e3);

        this._fitCamera();
        this._setupSun();
        this._setupClouds();
        this._setupHud();
        this._startGame();

        setTimeout(() => SoundManager.play('sparkle'), 600);
    }

    /** Card grid: 4 columns x 2 rows, local coordinates. */
    _cardSlots() {
        const cols = 4, rows = 2;
        const xSpacing = 1.5, ySpacing = 1.85;
        const slots = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                slots.push({
                    x: (c - (cols - 1) / 2) * xSpacing,
                    y: ((rows - 1) / 2 - r) * ySpacing
                });
            }
        }
        return slots;
    }

    /** Frame the whole scene for the current aspect ratio. */
    _fitCamera() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        const aspect = Math.max(0.4, w / h);
        const tanHalfFov = Math.tan(Helpers.degToRad(60) / 2);

        if (aspect >= 1.0) {
            const halfWidth = 4.0;
            const z = Math.max(10.5, halfWidth / (tanHalfFov * aspect));
            this.camera.position.set(0, 0.6, z);
            this.camera.lookAt(0, 0, 0);
            this.scene.fog = new THREE.Fog(0x7ec8e3, z + 6, z + 40);
            if (this.gridGroup) this.gridGroup.scale.setScalar(1.0);
            return;
        }

        // Portrait: pull back and shrink the grid so all 4 columns fit.
        const z = Math.max(13.5, 3.2 / (tanHalfFov * aspect));
        this.camera.position.set(0, 1.2, z);
        this.camera.lookAt(0, 0, 0);
        this.scene.fog = new THREE.Fog(0x7ec8e3, z + 8, z + 40);
        if (this.gridGroup) this.gridGroup.scale.setScalar(0.72);
    }

    /** Re-frame on resize (rotating a phone, changing window size). */
    _onResize() {
        super._onResize();
        this._fitCamera();
    }

    /** Soft glowing sun in a corner. */
    _setupSun() {
        const sunGeo = new THREE.SphereGeometry(1.4, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFE08A });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(-4.5, 4.0, -6);
        this.addGameObject(sun);
        sun.userData.decor = true;
        sun.userData.sun = true;

        const glowGeo = new THREE.SphereGeometry(2.0, 32, 32);
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
            color: 0xffffff, transparent: true, opacity: 0.9, shininess: 20
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

        makeCloud(-5.0, -3.8, -5, 1.0, 0.07, 0);
        makeCloud(5.0, 3.6, -5.5, 1.2, 0.055, 2.1);
    }

    /** HUD: title, match banner, star row. All Three.js sprites. */
    _setupHud() {
        this.hud = new THREE.Group();
        this.scene.add(this.hud);

        // --- Title card ---
        this._titleCanvas = document.createElement('canvas');
        this._titleCanvas.width = 640;
        this._titleCanvas.height = 160;
        const tctx = this._titleCanvas.getContext('2d');
        tctx.clearRect(0, 0, 640, 160);
        tctx.fillStyle = '#364fc7';
        tctx.font = 'bold 84px "Comic Sans MS", "Segoe UI", sans-serif';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.fillText('Memory Match \u{1F9E0}', 320, 84);
        this.titleSpriteMat = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(this._titleCanvas),
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.titleSprite = new THREE.Sprite(this.titleSpriteMat);
        this.titleSprite.scale.set(4.6, 1.15, 1);
        this.titleSprite.position.set(0, 3.15, 0);
        this.hud.add(this.titleSprite);

        // --- Match banner (hidden by default) ---
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
        this.bannerSprite.position.set(0, -2.35, 0);
        this.hud.add(this.bannerSprite);

        // --- Star row (marks pairs found) ---
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

        for (let i = 0; i < this.maxPairs; i++) {
            const mat = new THREE.SpriteMaterial({
                map: starTex,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false
            });
            const s = new THREE.Sprite(mat);
            s.scale.set(0.55, 0.55, 1);
            s.position.set((i - (this.maxPairs - 1) / 2) * 0.85, -3.1, 0);
            this.hud.add(s);
            this.starSprites.push(s);
        }
    }

    /** Draw a praise message on the banner canvas (auto-shrinks long text). */
    _setBanner(text) {
        const c = this._bannerCtx;
        c.clearRect(0, 0, 512, 160);

        let fontSize = 60;
        c.font = `bold ${fontSize}px "Comic Sans MS", "Segoe UI", sans-serif`;
        while (c.measureText(text).width > 430 && fontSize > 30) {
            fontSize -= 4;
            c.font = `bold ${fontSize}px "Comic Sans MS", "Segoe UI", sans-serif`;
        }
        const w = c.measureText(text).width;
        const pad = 60;
        const rw = Math.min(w + pad * 2, 496);

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
    // Round Setup
    // ==========================================

    _startGame() {
        this.matchedPairs = 0;
        this.firstPicked = null;
        this.busy = false;
        this.finished = false;

        // Pick 4 distinct emojis, each used twice
        const chosen = Helpers.shuffle(this.POOL).slice(0, this.maxPairs);
        const faceList = [];
        chosen.forEach(entry => {
            faceList.push(entry);
            faceList.push(entry);
        });
        const shuffled = Helpers.shuffle(faceList);
        const slots = this._cardSlots();

        // Grid container: tracked in the scene once; cards hang off it so
        // portrait can scale the whole layout at once without re-placing.
        this.gridGroup = new THREE.Group();
        this.addGameObject(this.gridGroup);

        for (let i = 0; i < shuffled.length; i++) {
            const entry = shuffled[i];
            const slot = slots[i];
            const card = this._makeCard(entry);
            card.position.set(slot.x, slot.y, 0);
            this.gridGroup.add(card);
            this.cards.push(card);
        }
        this._fitCamera(); // position the camera + scale gridGroup for aspect
    }

    /**
     * Build one card group: colored plate + "?" back + emoji face.
     * @param {{emoji:string, name:string}} entry
     * @returns {THREE.Group}
     */
    _makeCard(entry) {
        const W = 1.2, H = 1.6;
        const group = new THREE.Group();

        // Plate (shared box geometry, own material per card)
        if (!this.cardGeo.plate) {
            this.cardGeo.plate = new THREE.BoxGeometry(W, H, 0.1);
        }
        const plateMat = new THREE.MeshPhongMaterial({
            color: 0x4C6EF5,
            shininess: 70,
            emissive: new THREE.Color(0x4C6EF5).multiplyScalar(0.1)
        });
        const plate = new THREE.Mesh(this.cardGeo.plate, plateMat);
        plate.castShadow = true;
        group.add(plate);

        // Back mark: a soft "?" shown while face-down
        const backMark = this._makeTextSprite('?', 0xFFD43B, 0.7);
        backMark.position.z = 0.07;
        backMark.visible = true;
        group.add(backMark);

        // Face: the emoji, shown when flipped up
        const face = this._makeEmojiSprite(entry.emoji, 1.05);
        face.position.z = 0.08;
        face.visible = false;
        group.add(face);

        group.userData = {
            emoji: entry.emoji,
            name: entry.name,
            backMark: backMark,
            face: face,
            state: 'down',       // 'down' | 'up' | 'matched'
            anim: null
        };
        return group;
    }

    /** Emoji sprite from a canvas texture. */
    _makeEmojiSprite(emoji, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const c = canvas.getContext('2d');
        c.font = '92px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(emoji, 64, 70);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: tex, transparent: true, depthTest: false, depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(scale);
        return sprite;
    }

    /** A single text glyph sprite (used for the "?" card back). */
    _makeTextSprite(text, hex, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const c = canvas.getContext('2d');
        c.fillStyle = `#${hex.toString(16).padStart(6, '0')}`;
        c.font = 'bold 96px "Comic Sans MS", "Segoe UI", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, 64, 70);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
            map: tex, transparent: true, depthTest: false, depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.setScalar(scale);
        return sprite;
    }

    /** Start a flip tween on a card toward a given face state. */
    _startFlip(card, showFace) {
        card.userData.anim = { t: 0, dur: 0.32, swapped: false, showFace };
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

        // Title + banner gentle float
        if (this.titleSprite) {
            this.titleSprite.position.y = 3.15 + Math.sin(elapsed * 1.2) * 0.08;
        }
        if (this.bannerSprite) {
            const target = this.bannerSpriteMat._targetOpacity !== undefined
                ? this.bannerSpriteMat._targetOpacity : 0;
            this.bannerSpriteMat.opacity = Helpers.lerp(
                this.bannerSpriteMat.opacity, target, Math.min(1, delta * 4));
            if (this.bannerSpriteMat.opacity > 0.05) {
                this.bannerSprite.position.y = -2.35 + Math.sin(elapsed * 2) * 0.08;
            }
        }

        // Star row twinkle (lit stars = pairs found so far)
        this.starSprites.forEach((s, i) => {
            const lit = i < this.matchedPairs;
            const base = lit ? 1.0 : 0.3;
            s.material.opacity = base * (0.85 + 0.15 * Math.sin(elapsed * 3 + i));
        });

        // Cards: flip tweens + gentle idle bob
        for (const card of this.cards) {
            const u = card.userData;
            const a = u.anim;
            if (a) {
                a.t += delta;
                const p = Helpers.clamp(a.t / a.dur, 0, 1);
                const s = Math.abs(Math.cos(p * Math.PI)); // 1 -> 0 -> 1
                card.scale.x = Math.max(0.03, s);
                if (!a.swapped && p >= 0.5) {
                    a.swapped = true;
                    u.face.visible = a.showFace;
                    u.backMark.visible = !a.showFace;
                }
                if (p >= 1) {
                    card.scale.x = 1;
                    u.anim = null;
                }
            } else {
                // Matched cards get a happy bounce
                if (u.state === 'matched') {
                    card.scale.y = 1 + Math.sin(elapsed * 4 + card.position.x) * 0.05;
                } else {
                    card.scale.y = 1;
                }
            }
        }

        // Confetti pieces
        this._updateConfetti(delta);
    }

    // ==========================================
    // Interaction
    // ==========================================

    onClick(event) {
        if (this.busy || this.finished) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const cx = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
        const cy = (event.touches && event.touches[0]) ? event.touches[0].clientY : event.clientY;
        this.mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.cards, true);
        if (hits.length === 0) return;

        let obj = hits[0].object;
        while (obj.parent && this.cards.indexOf(obj) === -1) obj = obj.parent;
        if (this.cards.indexOf(obj) === -1) return;

        this._onCardTap(obj);
    }

    _onCardTap(card) {
        const u = card.userData;
        if (u.state !== 'down') return;   // ignore already-up / matched / mid-flip
        if (u.anim) return;

        // Flip this card up
        this._startFlip(card, true);
        u.state = 'up';
        SoundManager.play('pop');

        if (this.firstPicked === null) {
            this.firstPicked = card;
        } else {
            this._resolvePair(this.firstPicked, card);
        }
    }

    _resolvePair(a, b) {
        if (a.userData.emoji === b.userData.emoji) {
            this._onMatch(a, b);
        } else {
            this._onMismatch(a, b);
        }
    }

    _onMatch(a, b) {
        a.userData.state = 'matched';
        b.userData.state = 'matched';
        this.firstPicked = null;
        this.matchedPairs++;

        SoundManager.play('success');
        this._setBanner(`Match! ${a.userData.emoji} ${a.userData.name} \u{1F389}`);
        this.bannerSpriteMat._targetOpacity = 1;

        if (this.starSprites[this.matchedPairs - 1]) {
            this.starSprites[this.matchedPairs - 1].material.opacity = 1;
        }

        setTimeout(() => SoundManager.play('sparkle'), 350);

        if (this.matchedPairs >= this.maxPairs) {
            setTimeout(() => {
                if (!this.isRunning) return;
                this._gameOver();
            }, 1200);
        } else {
            // Fade the match banner after a beat
            setTimeout(() => {
                if (!this.isRunning) return;
                this.bannerSpriteMat._targetOpacity = 0;
            }, 1300);
        }
    }

    _onMismatch(a, b) {
        this.busy = true;
        this.firstPicked = null;
        SoundManager.play('error');
        Helpers.showToast('Almost! Try again \u{1F914}', 1400);

        // Let the second card finish flipping up, then flip both back
        setTimeout(() => {
            if (!this.isRunning) return;
            this._startFlip(a, false);
            this._startFlip(b, false);
            a.userData.state = 'down';
            b.userData.state = 'down';
            // Unlock after the flip-back tween completes
            setTimeout(() => {
                if (!this.isRunning) return;
                this.busy = false;
            }, 360);
        }, 700);
    }

    _gameOver() {
        if (this.finished) return;
        this.finished = true;
        this.busy = true;
        this._setBanner('You found them all! \u{1F389}');
        this.bannerSpriteMat._targetOpacity = 1;
        SoundManager.play('success');
        setTimeout(() => SoundManager.play('sparkle'), 300);
        setTimeout(() => SoundManager.play('sparkle'), 650);

        // Keep confetti falling in the background
        this._confettiTimer = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(this._confettiTimer);
                return;
            }
            this._spawnConfetti();
        }, 1600);
        this._spawnConfetti();
    }

    // ==========================================
    // Confetti
    // ==========================================

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
            piece.position.set(Helpers.random(-6, 6), Helpers.random(4, 7), Helpers.random(-2, 2));
            piece.userData.confetti = true;
            piece.userData.dead = false;
            piece.userData.vel = new THREE.Vector3(
                Helpers.random(-0.5, 0.5),
                -Helpers.random(1.5, 3),
                Helpers.random(-0.5, 0.5)
            );
            piece.userData.rotSpeed = Helpers.random(2, 6);
            this.scene.add(piece);
            this.gameObjects.push(piece);
        }
    }

    _updateConfetti(delta) {
        // Confetti lives directly in the scene, so walk gameObjects for the flag
        const pieces = this.gameObjects.filter(o => o.userData.confetti);
        for (const p of pieces) {
            p.position.addScaledVector(p.userData.vel, delta);
            p.rotation.x += delta * p.userData.rotSpeed;
            p.rotation.y += delta * p.userData.rotSpeed * 0.7;
            if (p.position.y < -3) p.userData.dead = true;
        }
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const o = this.gameObjects[i];
            if (o.userData.confetti && o.userData.dead) {
                this.removeGameObject(o);
                if (o.geometry) o.geometry.dispose();
                if (o.material) o.material.dispose();
            }
        }
    }

    // ==========================================
    // Cleanup
    // ==========================================

    dispose() {
        if (this._confettiTimer) {
            clearInterval(this._confettiTimer);
            this._confettiTimer = null;
        }
        // Dispose any canvas textures still held by scene objects
        // (material.map is not handled by BaseGame.dispose)
        if (this.scene) {
            this.scene.traverse(child => {
                if (child.material && child.material.map) child.material.map.dispose();
            });
        }
        this.cards = [];
        super.dispose();

        // Shared geometry
        Object.values(this.cardGeo).forEach(geo => { if (geo) geo.dispose(); });
        this.cardGeo = {};

        // HUD canvas textures
        if (this.titleSpriteMat && this.titleSpriteMat.map) this.titleSpriteMat.map.dispose();
        if (this.bannerSpriteMat && this.bannerSpriteMat.map) this.bannerSpriteMat.map.dispose();
        if (this._starTex) this._starTex.dispose();
    }
}

// Register with the game manager
// GAMES[3] is the "memory-match" entry (index 3)
if (typeof GAMES !== 'undefined') {
    GAMES[3].gameClass = MemoryMatchGame;
}