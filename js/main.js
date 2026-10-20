/**
 * My Game World — Main Game Manager
 * Handles: game registry, 3D animated background, menu, navigation, and audio.
 *
 * Architecture:
 *   helpers.js  → shared utility functions
 *   sound.js    → Web Audio API sound effects (no external files needed)
 *   base-game.js→ abstract BaseGame class with Three.js scene lifecycle
 *   main.js     → GameManager: menu, routing, 3D background
 *   games/*.js  → individual game classes extending BaseGame
 */

// ============================================
// Game Registry
// ============================================
// Each game entry defines its identity. When a game is implemented,
// its JS file sets `gameClass` to the class constructor.
// If gameClass is null, a "Coming Soon" placeholder is shown.

const GAMES = [
    {
        id: 'color-shapes',
        name: 'Color Shapes',
        icon: '🎨',
        desc: 'Learn colors and shapes together!',
        color: '#FF6B6B',
        gameClass: null
    },
    {
        id: 'counting-fun',
        name: 'Counting Fun',
        icon: '🔢',
        desc: 'Count and match the numbers!',
        color: '#FFA94D',
        gameClass: null
    },
    {
        id: 'abc-adventure',
        name: 'ABC Adventure',
        icon: '🔤',
        desc: 'Explore the alphabet world!',
        color: '#FFD43B',
        gameClass: null
    },
    {
        id: 'memory-match',
        name: 'Memory Match',
        icon: '🧠',
        desc: 'Match the pairs and train your brain!',
        color: '#69DB7C',
        gameClass: null
    },
    {
        id: 'puzzle-world',
        name: 'Puzzle World',
        icon: '🧩',
        desc: 'Solve fun puzzles to the end!',
        color: '#38D9A9',
        gameClass: null
    },
    {
        id: 'sort-it-out',
        name: 'Sort It Out',
        icon: '📦',
        desc: 'Sort things by color and size!',
        color: '#4DABF7',
        gameClass: null
    },
    {
        id: 'animal-friends',
        name: 'Animal Friends',
        icon: '🦁',
        desc: 'Meet your new animal friends!',
        color: '#7950F2',
        gameClass: null
    },
    {
        id: 'pattern-play',
        name: 'Pattern Play',
        icon: '🔮',
        desc: 'Find the pattern and keep going!',
        color: '#FF8787',
        gameClass: null
    },
    {
        id: 'doodle-pad',
        name: 'Doodle Pad',
        icon: '✏️',
        desc: 'Draw and create your own art!',
        color: '#F783AC',
        gameClass: null
    },
    {
        id: '3d-world',
        name: '3D World',
        icon: '🚀',
        desc: 'Explore a magical 3D world!',
        color: '#3B82F6',
        gameClass: null
    }
];

// ============================================
// 3D Background — floating colorful shapes
// ============================================
class Background3D {
    /**
     * @param {HTMLCanvasElement} canvas
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.shapes = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.isRunning = false;
        this._rafId = null;
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x667eea, 12, 35);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, 0, 12);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // --- Lighting ---
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        const fillLight = new THREE.PointLight(0xf093fb, 0.4, 30);
        fillLight.position.set(-5, 5, 5);
        this.scene.add(fillLight);

        this._createShapes();
        this._setupEvents();

        // Fade in the canvas
        this.canvas.classList.add('loaded');

        this.isRunning = true;
        this._animate();
    }

    _createShapes() {
        const colors = [
            0xFF6B6B, 0xFFA94D, 0xFFD43B, 0x69DB7C, 0x38D9A9,
            0x4DABF7, 0x7950F2, 0xFF8787, 0xF783AC, 0x3B82F6,
            0xFF9FF3, 0x54a0ff, 0x5f27cd, 0x01a3a4, 0xf368e0
        ];

        const geometryFactories = [
            () => new THREE.SphereGeometry(0.5, 24, 24),
            () => new THREE.BoxGeometry(0.8, 0.8, 0.8),
            () => new THREE.TorusGeometry(0.4, 0.15, 16, 48),
            () => new THREE.IcosahedronGeometry(0.5, 0),
            () => new THREE.ConeGeometry(0.4, 0.8, 8),
            () => new THREE.OctahedronGeometry(0.5, 0),
            () => new THREE.TorusKnotGeometry(0.3, 0.1, 48, 12)
        ];

        for (let i = 0; i < 18; i++) {
            const geo = geometryFactories[i % geometryFactories.length]();
            const mat = new THREE.MeshPhongMaterial({
                color: colors[i % colors.length],
                shininess: 80,
                transparent: true,
                opacity: 0.7
            });
            const mesh = new THREE.Mesh(geo, mat);

            // Random position in a wide area
            mesh.position.x = (Math.random() - 0.5) * 22;
            mesh.position.y = (Math.random() - 0.5) * 14;
            mesh.position.z = (Math.random() - 0.5) * 8 - 2;

            // Per-shape animation params
            mesh.userData.rotX = (Math.random() - 0.5) * 0.02;
            mesh.userData.rotY = (Math.random() - 0.5) * 0.02;
            mesh.userData.rotZ = (Math.random() - 0.5) * 0.01;
            mesh.userData.floatOffset = Math.random() * Math.PI * 2;
            mesh.userData.floatSpeed = 0.3 + Math.random() * 0.5;
            mesh.userData.floatAmplitude = 0.3 + Math.random() * 0.5;
            mesh.userData.baseY = mesh.position.y;

            this.scene.add(mesh);
            this.shapes.push(mesh);
        }
    }

    _setupEvents() {
        this._handleResize = () => this._onResize();
        window.addEventListener('resize', this._handleResize);

        this._handleMouseMove = (e) => {
            this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
            this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        document.addEventListener('mousemove', this._handleMouseMove);

        this._handleTouchMove = (e) => {
            if (e.touches.length > 0) {
                this.mouseX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
                this.mouseY = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
            }
        };
        document.addEventListener('touchmove', this._handleTouchMove, { passive: true });
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    _animate() {
        if (!this.isRunning) return;

        this._rafId = requestAnimationFrame(() => this._animate());

        const time = performance.now() * 0.001;

        for (const shape of this.shapes) {
            shape.rotation.x += shape.userData.rotX;
            shape.rotation.y += shape.userData.rotY;
            shape.rotation.z += shape.userData.rotZ;

            shape.position.y = shape.userData.baseY +
                Math.sin(time * shape.userData.floatSpeed + shape.userData.floatOffset) *
                shape.userData.floatAmplitude;
        }

        // Gentle parallax on camera
        this.camera.position.x += (this.mouseX * 1.5 - this.camera.position.x) * 0.02;
        this.camera.position.y += (-this.mouseY * 1 - this.camera.position.y) * 0.02;
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this._animate();
        }
    }

    stop() {
        this.isRunning = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }

    dispose() {
        this.stop();
        window.removeEventListener('resize', this._handleResize);
        document.removeEventListener('mousemove', this._handleMouseMove);
        document.removeEventListener('touchmove', this._handleTouchMove);

        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });
        this.renderer.dispose();
        this.shapes = [];
    }
}

// ============================================
// Game Manager — menu, routing, audio
// ============================================
class GameManager {
    constructor() {
        this.background = null;
        this.currentGame = null;

        this.menuEl = document.getElementById('menu-container');
        this.gameContainer = document.getElementById('game-container');
        this.gameView = document.getElementById('game-view');
        this.gameGrid = document.getElementById('game-grid');
        this.btnBack = document.getElementById('btn-back');
    }

    init() {
        this._createMenu();
        this._setupEvents();

        // Initialize 3D background
        const canvas = document.getElementById('bg-canvas');
        this.background = new Background3D(canvas);
        this.background.init();
    }

    _createMenu() {
        GAMES.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.style.setProperty('--card-color', game.color);
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Play ${game.name}`);

            card.innerHTML = `
                <span class="game-card-icon">${game.icon}</span>
                <h2 class="game-card-title">${game.name}</h2>
                <p class="game-card-desc">${game.desc}</p>
            `;

            card.addEventListener('click', () => this.launchGame(game));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.launchGame(game);
                }
            });

            this.gameGrid.appendChild(card);
        });
    }

    _setupEvents() {
        this.btnBack.addEventListener('click', () => this.showMenu());
    }

    /**
     * Launch a game by its config object.
     * If the game class is registered, instantiate and start it.
     * Otherwise, show a "Coming Soon" placeholder.
     */
    launchGame(game) {
        SoundManager.play('click');
        this.background.stop();

        // Clear previous game view
        this.gameView.innerHTML = '';

        if (game.gameClass) {
            const instance = new game.gameClass(this.gameView);
            this.currentGame = instance;
            instance.init();
            instance.start();
        } else {
            this._showComingSoon(game);
        }

        // Switch views
        this.menuEl.classList.add('hidden');
        this.gameContainer.classList.add('active');
    }

    _showComingSoon(game) {
        this.gameView.innerHTML = `
            <div class="coming-soon">
                <span class="coming-soon-icon">${game.icon}</span>
                <h2 class="coming-soon-title">${game.name}</h2>
                <p class="coming-soon-text">This game is coming soon!<br>Stay tuned for the fun! 🎉</p>
                <button class="coming-soon-btn" id="btn-back-from-game">← Back to Menu</button>
            </div>
        `;
        document.getElementById('btn-back-from-game')
            .addEventListener('click', () => this.showMenu());
    }

    /**
     * Return to the main menu, disposing the current game.
     */
    showMenu() {
        SoundManager.play('click');

        if (this.currentGame && this.currentGame.dispose) {
            this.currentGame.dispose();
            this.currentGame = null;
        }

        this.gameView.innerHTML = '';
        this.gameContainer.classList.remove('active');
        this.menuEl.classList.remove('hidden');

        this.background.start();
    }
}

// ============================================
// Bootstrap
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const manager = new GameManager();
    manager.init();

    // Expose for debugging / future game loading
    window.gameManager = manager;
    window.GAMES = GAMES;
});
