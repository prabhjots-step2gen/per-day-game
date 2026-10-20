/**
 * Puzzle World - Sliding Picture Puzzle
 * A gentle slide-puzzle game for little ones.
 *
 * Gameplay:
 *   - A big animal picture (drawn on a canvas, split into 4 quadrants)
 *     appears as a 2x2 board: 3 puzzle tiles + 1 empty hole
 *   - Tap a tile that is next to the hole and it slides over
 *   - Slide all three tiles home and the whole animal appears with a
 *     sparkle celebration and a star lights up
 *   - Solve 3 puzzles (3 different animals) and a starry confetti finale
 *     plays
 *
 * How it works (forgiving design, no penalties):
 *   - The board is shuffled with random legal slides, so it is ALWAYS
 *     solvable - no unsolvable states can ever appear
 *   - Tapping a tile that can't move just makes it wobble a little -
 *     no error sounds, no penalties
 *   - A small "goal" preview of the finished picture stays visible so
 *     the child always knows what to aim for
 *
 * Architecture:
 *   - Extends BaseGame (scene, camera, renderer, loop, cleanup)
 *   - Each tile is a 3D group: a cream frame box + a plane showing one
 *     quadrant of the puzzle canvas (CanvasTexture offset/repeat)
 *   - Board model: board[slotIndex] = pieceId (null = hole)
 */

class PuzzleWorldGame extends BaseGame {
    constructor(container) {
        super(container);
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // --- Game state ---
        this.board = [0, 1, 2, null];  // board[slot] = pieceId, null = hole
        this.hole = 3;                 // slot index of the empty hole
        this.tiles = {};               // pieceId -> tile group
        this.puzzleIndex = 0;          // puzzles completed so far
        this.maxPuzzles = 3;
        this.busy = false;             // a slide animation is running
        this.solving = false;          // celebration between puzzles
        this.finished = false;         // true after the final puzzle
        this.animalOrder = [];         // the 3 animals for this play
        this.currentAnimal = null;
        this._puzzleCanvas = null;
        this._puzzleTextures = [];     // textures alive for the current puzzle

        // Shared geometry (disposed once)
        this.tileGeo = { frame: null, face: null, marker: null };

        // HUD
        this.hud = null;
        this.titleSprite = null;
        this.titleSpriteMat = null;
        this.bannerSprite = null;
        this.bannerSpriteMat = null;
        this.previewSprite = null;
        this.previewSpriteMat = null;
        this.starSprites = [];
        this.boardGroup = null;
        this.holeMarker = null;
        this._titleBaseY = 3.3;
        this._bannerBaseY = -2.8;
        this._starTex = null;
        this._confettiTimer = null;
    }

    // ==========================================
    // Animal Pool - enough distinct pictures to pick 3 per play
    // ==========================================

    get POOL() {
        return [
            { emoji: '\u{1F981}', name: 'Lion',      bg: '#FFE08A' },
            { emoji: '\u{1F422}', name: 'Turtle',    bg: '#B2F2BB' },
            { emoji: '\u{1F984}', name: 'Unicorn',   bg: '#FFDEEB' },
            { emoji: '\u{1F419}', name: 'Octopus',   bg: '#D0EBFF' },
            { emoji: '\u{1F98B}', name: 'Butterfly', bg: '#E5DBFF' },
            { emoji: '\u{1F988}', name: 'Frog',      bg: '#D3F9D8' },
            { emoji: '\u{1F43C}', name: 'Panda',     bg: '#FFF9DB' },
            { emoji: '\u{1F98A}', name: 'Fox',       bg: '#FFE8CC' }
        ];
    }

    /** Neighbouring slots for each slot index (2x2 grid). */
    get ADJ() {
        return [[1, 2], [0, 3], [0, 3], [1, 2]];
    }

    /** Local board coordinates for a slot index. */
    _slotXY(slot) {
        return {
            x: (slot === 0 || slot === 2) ? -1.02 : 1.02,
            y: (slot < 2) ? 1.02 : -1.02
        };
    }

    /** True when every tile is in its home slot (hole bottom-right). */
    _isSolved() {
        return this.board[0] === 0 &&
               this.board[1] === 1 &&
               this.board[2] === 2 &&
               this.board[3] === null;
    }

    // ==========================================
    // Game Init
    // ==========================================

    gameInit() {
        // Warm sunset workshop where the puzzles get built
        this.scene.background = new THREE.Color(0xffc98b);

        this._setupSun();
        this._setupClouds();
        this._setupPuzzleDeco();
        this._setupHud();
        this._startGame();

        setTimeout(() => SoundManager.play('sparkle'), 600);
    }

    /** Frame the whole scene for the current aspect ratio. */
    _fitCamera() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        const aspect = Math.max(0.4, w / h);
        const tanHalfFov = Math.tan(Helpers.degToRad(60) / 2);

        if (aspect >= 1.0) {
            const z = Math.max(9.5, 3.9 / (tanHalfFov * aspect));
            this.camera.position.set(0, 0.5, z);
            this.camera.lookAt(0, 0, 0);
            this.scene.fog = new THREE.Fog(0xffc98b, z + 6, z + 40);
            if (this.boardGroup) this.boardGroup.scale.setScalar(1.0);
            if (this.previewSprite) {
                this.previewSprite.position.set(-3.9, 2.75, 0);
                this.previewSprite.scale.set(1.5, 1.5, 1);
            }
            this._titleBaseY = 3.3;
            this._bannerBaseY = -2.8;
            return;
        }

        // Portrait: pull back, shrink the board, tuck the preview in.
        const z = Math.max(12.5, 3.2 / (tanHalfFov * aspect));
        this.camera.position.set(0, 1.0, z);
        this.camera.lookAt(0, 0, 0);
        this.scene.fog = new THREE.Fog(0xffc98b, z + 8, z + 40);
        if (this.boardGroup) this.boardGroup.scale.setScalar(0.75);
        if (this.previewSprite) {
            this.previewSprite.position.set(-3.0, 3.05, 0);
            this.previewSprite.scale.set(1.05, 1.05, 1);
        }
        this._titleBaseY = 3.6;
        this._bannerBaseY = -2.8;
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
        sun.position.set(4.5, 4.0, -6);
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

    /** A few puzzle-piece emoji drifting in the background. */
    _setupPuzzleDeco() {
        const spots = [
            [-4.6, -2.6, -4, 0.8, 0.5, 0],
            [5.0, -2.0, -4.5, 0.9, 0.4, 1.7],
            [-5.2, 2.4, -5, 0.7, 0.45, 3.1]
        ];
        spots.forEach(s => {
            const sp = this._makeEmojiSprite('\u{1F9E9}', s[3]);
            sp.position.set(s[0], s[1], s[2]);
            sp.userData.decor = true;
            sp.userData.puz = true;
            sp.userData.baseY = s[1];
            sp.userData.floatSpeed = s[4];
            sp.userData.floatOffset = s[5];
            this.addGameObject(sp);
        });
    }

    /** HUD: title, goal preview, banner, star row. All Three.js sprites. */
    _setupHud() {
        this.hud = new THREE.Group();
        this.scene.add(this.hud);

        // --- Title card ---
        this._titleCanvas = document.createElement('canvas');
        this._titleCanvas.width = 640;
        this._titleCanvas.height = 160;
        const tctx = this._titleCanvas.getContext('2d');
        tctx.clearRect(0, 0, 640, 160);
        tctx.fillStyle = '#7c2d12';
        tctx.font = 'bold 84px "Comic Sans MS", "Segoe UI", sans-serif';
        tctx.textAlign = 'center';
        tctx.textBaseline = 'middle';
        tctx.fillText('Puzzle World \u{1F9E9}', 320, 84);
        this.titleSpriteMat = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(this._titleCanvas),
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.titleSprite = new THREE.Sprite(this.titleSpriteMat);
        this.titleSprite.scale.set(4.6, 1.15, 1);
        this.titleSprite.position.set(0, this._titleBaseY, 0);
        this.hud.add(this.titleSprite);

        // --- Goal preview: the finished picture (replaced per puzzle) ---
        this._previewCanvas = document.createElement('canvas');
        this._previewCanvas.width = 512;
        this._previewCanvas.height = 512;
        const pctx = this._previewCanvas.getContext('2d');
        pctx.clearRect(0, 0, 512, 512);
        pctx.font = '300px serif';
        pctx.textAlign = 'center';
        pctx.textBaseline = 'middle';
        pctx.fillText('\u{1F9E9}', 256, 276);
        this.previewSpriteMat = new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(this._previewCanvas),
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        this.previewSprite = new THREE.Sprite(this.previewSpriteMat);
        this.previewSprite.scale.set(1.5, 1.5, 1);
        this.previewSprite.position.set(-3.9, 2.75, 0);
        this.hud.add(this.previewSprite);

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
        this.bannerSprite.position.set(0, this._bannerBaseY, 0);
        this.hud.add(this.bannerSprite);

        // --- Star row (one star per solved puzzle) ---
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
        this._starTex = new THREE.CanvasTexture(this._starCanvas);

        for (let i = 0; i < this.maxPuzzles; i++) {
            const mat = new THREE.SpriteMaterial({
                map: this._starTex,
                transparent: true,
                opacity: 0.3,
                depthTest: false,
                depthWrite: false
            });
            const s = new THREE.Sprite(mat);
            s.scale.set(0.55, 0.55, 1);
            s.position.set((i - (this.maxPuzzles - 1) / 2) * 0.85, -3.5, 0);
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

        c.fillStyle = '#7c2d12';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(text, 256, 84);

        this.bannerSpriteMat.map.needsUpdate = true;
    }

    // ==========================================
    // Puzzle Setup
    // ==========================================

    _startGame() {
        this.puzzleIndex = 0;
        this.busy = false;
        this.solving = false;
        this.finished = false;
        this.animalOrder = Helpers.shuffle(this.POOL).slice(0, this.maxPuzzles);

        // Board container: tracked in the scene once; tiles hang off it so
        // portrait can scale the whole layout at once without re-placing.
        this.boardGroup = new THREE.Group();
        this.addGameObject(this.boardGroup);

        // Hole marker: a soft plate showing where the next piece goes
        this.tileGeo.marker = new THREE.PlaneGeometry(1.94, 1.94);
        const markerMat = new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false
        });
        this.holeMarker = new THREE.Mesh(this.tileGeo.marker, markerMat);
        const p0 = this._slotXY(3);
        this.holeMarker.position.set(p0.x, p0.y, -0.04);
        this.boardGroup.add(this.holeMarker);

        this._startPuzzle(0);
        this._fitCamera();
    }

    /** Build the board for puzzle i and shuffle it (always solvable). */
    _startPuzzle(i) {
        this.currentAnimal = this.animalOrder[i];
        this._puzzleCanvas = this._makePuzzleCanvas(
            this.currentAnimal.emoji, this.currentAnimal.bg);
        this._puzzleTextures = [];

        // Goal preview shows the finished picture
        if (this.previewSpriteMat.map) this.previewSpriteMat.map.dispose();
        const previewTex = new THREE.CanvasTexture(this._puzzleCanvas);
        this.previewSpriteMat.map = previewTex;
        this.previewSpriteMat.needsUpdate = true;
        this._puzzleTextures.push(previewTex);

        // Three tiles, each showing one quadrant of the picture
        const pieces = [
            { id: 0, col: 0, row: 0 },  // top-left
            { id: 1, col: 1, row: 0 },  // top-right
            { id: 2, col: 0, row: 1 }   // bottom-left
        ];
        this.board = [0, 1, 2, null];
        this.hole = 3;
        this.tiles = {};
        for (const pc of pieces) {
            const tile = this._makeTile(pc);
            const s = this._slotXY(pc.id);
            tile.position.set(s.x, s.y, 0);
            this.boardGroup.add(tile);
            this.tiles[pc.id] = tile;
        }

        this._shuffleBoard();

        // Gentle intro banner
        this._setBanner(`Puzzle ${i + 1} \u2014 make the ${this.currentAnimal.name}!`);
        this.bannerSpriteMat._targetOpacity = 1;
        setTimeout(() => {
            if (!this.isRunning || this.solving) return;
            this.bannerSpriteMat._targetOpacity = 0;
        }, 1600);
    }

    /**
     * Build one tile group: cream frame + a plane with one quadrant of
     * the puzzle picture on it.
     * @param {{id:number, col:number, row:number}} pc
     * @returns {THREE.Group}
     */
    _makeTile(pc) {
        const group = new THREE.Group();

        if (!this.tileGeo.frame) {
            this.tileGeo.frame = new THREE.BoxGeometry(2.0, 2.0, 0.14);
        }
        const frameMat = new THREE.MeshPhongMaterial({
            color: 0xFFF3DF,
            shininess: 40,
            emissive: new THREE.Color(0xFFF3DF).multiplyScalar(0.08)
        });
        const frame = new THREE.Mesh(this.tileGeo.frame, frameMat);
        frame.castShadow = true;
        group.add(frame);

        const tex = this._quadrantTexture(pc.col, pc.row);
        this._puzzleTextures.push(tex);
        const faceMat = new THREE.MeshBasicMaterial({ map: tex });
        if (!this.tileGeo.face) {
            this.tileGeo.face = new THREE.PlaneGeometry(1.92, 1.92);
        }
        const face = new THREE.Mesh(this.tileGeo.face, faceMat);
        face.position.z = 0.075;
        group.add(face);

        group.userData = { piece: pc.id, slot: pc.id, anim: null, wobble: 0 };
        return group;
    }

    /** Emoji sprite from a canvas texture (background puzzle pieces). */
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

    /** A CanvasTexture view of one quadrant of the puzzle canvas. */
    _quadrantTexture(col, row) {
        const t = new THREE.CanvasTexture(this._puzzleCanvas);
        t.repeat.set(0.5, 0.5);
        t.offset.set(col * 0.5, row === 0 ? 0.5 : 0);
        return t;
    }

    /** Draw the full animal picture on a 512x512 canvas. */
    _makePuzzleCanvas(emoji, bg) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const c = canvas.getContext('2d');
        c.fillStyle = bg;
        c.fillRect(0, 0, 512, 512);
        c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        c.lineWidth = 14;
        c.strokeRect(7, 7, 498, 498);
        c.font = '340px serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(emoji, 256, 276);
        return canvas;
    }

    /**
     * Shuffle the board by BFS-enumerating all reachable states from the
     * solved configuration, then picking a random non-trivial one.
     * This guarantees solvability (every state is reachable from solved)
     * and avoids the trivial solved / 1-move states for a better puzzle
     * experience.
     */
    _shuffleBoard() {
        const ADJ = this.ADJ;
        const key = (b) => b.join(',');
        const start = [0, 1, 2, null];

        // BFS: collect all reachable states with their distance from solved
        const visited = {};
        const states = [];
        const queue = [[start.slice(), 0]];
        visited[key(start)] = true;
        while (queue.length > 0) {
            const cur = queue.shift();
            const b = cur[0];
            const dist = cur[1];
            states.push({ board: b.slice(), dist: dist });
            const h = b.indexOf(null);
            for (const s of ADJ[h]) {
                const nb = b.slice();
                nb[h] = nb[s];
                nb[s] = null;
                const nk = key(nb);
                if (!visited[nk]) {
                    visited[nk] = true;
                    queue.push([nb, dist + 1]);
                }
            }
        }

        // Filter: exclude solved (dist 0) and trivially-easy (dist 1) states
        const candidates = states.filter(st => st.dist >= 2);
        const pool = candidates.length > 0 ? candidates : states.filter(st => st.dist > 0);
        const picked = pool[Helpers.randomInt(0, pool.length - 1)];

        this.board = picked.board.slice();
        this.hole = this.board.indexOf(null);

        // Place tiles and the hole marker at their shuffled slots
        for (const tile of Object.values(this.tiles)) {
            const slot = this.board.indexOf(tile.userData.piece);
            const p = this._slotXY(slot);
            tile.position.set(p.x, p.y, 0);
            tile.userData.slot = slot;
            tile.userData.anim = null;
            tile.userData.wobble = 0;
        }
        const hp = this._slotXY(this.hole);
        this.holeMarker.position.set(hp.x, hp.y, -0.04);
    }

    /** Remove the current tiles and their per-puzzle textures. */
    _teardownPuzzle() {
        for (const tile of Object.values(this.tiles)) {
            this.boardGroup.remove(tile);
            tile.traverse(ch => {
                if (ch.material) {
                    if (ch.material.map) ch.material.map.dispose();
                    ch.material.dispose();
                }
            });
        }
        this.tiles = {};
        this._puzzleTextures = [];
    }

    // ==========================================
    // Per-Frame Update
    // ==========================================

    update(delta, elapsed) {
        // Decorations: sun pulse, drifting clouds, floating puzzle pieces
        this.gameObjects.forEach(obj => {
            const u = obj.userData;
            if (!u.decor) return;
            if (u.sun) {
                obj.scale.setScalar(1 + Math.sin(elapsed * 1.5) * 0.04);
            }
            if (u.cloud) {
                obj.position.x = u.baseX +
                    Math.sin(elapsed * u.cloudSpeed + u.cloudOffset) * 2.5;
            }
            if (u.puz) {
                obj.position.y = u.baseY +
                    Math.sin(elapsed * u.floatSpeed + u.floatOffset) * 0.4;
            }
        });

        // Title + banner gentle float
        if (this.titleSprite) {
            this.titleSprite.position.y = this._titleBaseY + Math.sin(elapsed * 1.2) * 0.08;
        }
        if (this.bannerSprite) {
            const target = this.bannerSpriteMat._targetOpacity !== undefined
                ? this.bannerSpriteMat._targetOpacity : 0;
            this.bannerSpriteMat.opacity = Helpers.lerp(
                this.bannerSpriteMat.opacity, target, Math.min(1, delta * 4));
            if (this.bannerSpriteMat.opacity > 0.05) {
                this.bannerSprite.position.y = this._bannerBaseY + Math.sin(elapsed * 2) * 0.08;
            }
        }

        // Star row (lit stars = puzzles solved so far)
        this.starSprites.forEach((s, i) => {
            const lit = i < this.puzzleIndex;
            const base = lit ? 1.0 : 0.3;
            s.material.opacity = base * (0.85 + 0.15 * Math.sin(elapsed * 3 + i));
        });

        // Tiles: slide tweens, wobble decay, celebration pulse
        for (const tile of Object.values(this.tiles)) {
            const u = tile.userData;
            if (u.anim) {
                u.anim.t += delta;
                const p = Helpers.clamp(u.anim.t / u.anim.dur, 0, 1);
                const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
                tile.position.x = Helpers.lerp(u.anim.from.x, u.anim.to.x, e);
                tile.position.y = Helpers.lerp(u.anim.from.y, u.anim.to.y, e);
                tile.scale.setScalar(1);
                if (p >= 1) {
                    tile.position.x = u.anim.to.x;
                    tile.position.y = u.anim.to.y;
                    u.anim = null;
                    if (this.busy) this.busy = false;
                }
            } else if (u.wobble > 0) {
                u.wobble = Math.max(0, u.wobble - delta);
                tile.rotation.z = Math.sin(u.wobble * 45) * 0.07 * (u.wobble / 0.3);
            } else {
                tile.rotation.z = 0;
                if (this.solving && !this.finished) {
                    tile.scale.setScalar(1 + Math.sin(elapsed * 6 + u.piece) * 0.05);
                } else {
                    tile.scale.setScalar(1);
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
        if (this.busy || this.solving || this.finished) return;

        const rect = this.renderer.domElement.getBoundingClientRect();
        const cx = (event.touches && event.touches[0]) ? event.touches[0].clientX : event.clientX;
        const cy = (event.touches && event.touches[0]) ? event.touches[0].clientY : event.clientY;
        this.mouse.x = ((cx - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((cy - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const tileList = Object.values(this.tiles);
        const hits = this.raycaster.intersectObjects(tileList, true);
        if (hits.length === 0) return;

        let obj = hits[0].object;
        while (obj.parent && tileList.indexOf(obj) === -1) obj = obj.parent;
        if (tileList.indexOf(obj) === -1) return;

        this._onTileTap(obj);
    }

    /** Slide a tile into the hole if it is next to it; wobble if not. */
    _onTileTap(tile) {
        const u = tile.userData;
        if (u.anim) return;
        const slot = u.slot;

        if (this.ADJ[this.hole].indexOf(slot) === -1) {
            // Can't reach the hole: a gentle wobble, no penalty
            u.wobble = 0.3;
            SoundManager.play('click');
            return;
        }

        // Move the tile from its slot into the hole
        const toSlot = this.hole;
        const newHole = slot;
        const from = { x: tile.position.x, y: tile.position.y };
        const to = this._slotXY(toSlot);

        this.board[toSlot] = u.piece;
        this.board[newHole] = null;
        this.hole = newHole;
        u.slot = toSlot;
        u.anim = { from, to, t: 0, dur: 0.18 };
        this.busy = true;

        const hp = this._slotXY(newHole);
        this.holeMarker.position.set(hp.x, hp.y, -0.04);

        SoundManager.play('pop');

        if (this._isSolved()) {
            this.solving = true;
            this._onPuzzleSolved();
        }
    }

    /** Celebration: star lights up, then on to the next puzzle. */
    _onPuzzleSolved() {
        this.puzzleIndex++;
        SoundManager.play('success');
        this._setBanner(`${this.currentAnimal.name} ${this.currentAnimal.emoji} complete! \u{1F389}`);
        this.bannerSpriteMat._targetOpacity = 1;
        if (this.starSprites[this.puzzleIndex - 1]) {
            this.starSprites[this.puzzleIndex - 1].material.opacity = 1;
        }
        setTimeout(() => SoundManager.play('sparkle'), 350);

        setTimeout(() => {
            if (!this.isRunning) return;
            if (this.puzzleIndex >= this.maxPuzzles) {
                this._gameOver();
            } else {
                this._teardownPuzzle();
                this.solving = false;
                this.busy = false;
                this._startPuzzle(this.puzzleIndex);
            }
        }, 1800);
    }

    _gameOver() {
        if (this.finished) return;
        this.finished = true;
        this._setBanner('You solved them all! \u{1F389}');
        this.bannerSpriteMat._targetOpacity = 1;
        SoundManager.play('success');
        setTimeout(() => SoundManager.play('sparkle'), 300);
        setTimeout(() => SoundManager.play('sparkle'), 650);

        // Keep confetti falling in the background
        this._confettiTimer = setInterval(() => {
            if (!this.isRunning) {
                clearInterval(this._confettiTimer);
                this._confettiTimer = null;
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
        // Board contents: tiles are children of boardGroup (a tracked
        // object), so dispose their materials + textures explicitly before
        // BaseGame removes the group from the scene.
        if (this.boardGroup) {
            this.boardGroup.traverse(ch => {
                if (ch.material) {
                    if (ch.material.map) ch.material.map.dispose();
                    ch.material.dispose();
                }
            });
        }
        this.tiles = {};
        this._puzzleTextures = [];
        super.dispose();

        // Shared geometry
        Object.values(this.tileGeo).forEach(geo => { if (geo) geo.dispose(); });
        this.tileGeo = {};

        // HUD canvas textures
        if (this.titleSpriteMat && this.titleSpriteMat.map) this.titleSpriteMat.map.dispose();
        if (this.bannerSpriteMat && this.bannerSpriteMat.map) this.bannerSpriteMat.map.dispose();
        if (this._starTex) this._starTex.dispose();
    }
}

// Register with the game manager
// GAMES[4] is the "puzzle-world" entry (index 4)
if (typeof GAMES !== 'undefined') {
    GAMES[4].gameClass = PuzzleWorldGame;
}