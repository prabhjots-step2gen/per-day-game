/**
 * Base Game Class
 * All games extend this class to get Three.js scene setup,
 * the render loop, input handling, and resource cleanup.
 *
 * To create a new game:
 *   1. Create a file in /games/ (e.g., games/counting-fun.js)
 *   2. Define a class extending BaseGame
 *   3. Override gameInit(), update(), and optionally onClick()
 *   4. Register the class: GAMES[1].gameClass = CountingFunGame
 *   5. Add a <script> tag in index.html after js/main.js
 */
class BaseGame {
    /**
     * @param {HTMLElement} container - DOM element where the game renders
     */
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.isRunning = false;
        this._rafId = null;
        this.gameObjects = [];
    }

    // ==========================================
    // Lifecycle
    // ==========================================

    /**
     * Initialize the game. Called once when the game is launched.
     * Sets up scene, camera, renderer, lighting, input, then calls gameInit().
     */
    init() {
        this._setupScene();
        this._setupCamera();
        this._setupRenderer();
        this._setupLighting();
        this._setupInput();
        this.gameInit();
    }

    /**
     * Start the animation loop. Call after init().
     */
    start() {
        this.isRunning = true;
        this._animate();
    }

    /**
     * Stop the animation loop without destroying resources.
     */
    stop() {
        this.isRunning = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    /**
     * Clean up ALL resources. Call when leaving the game.
     * Disposes geometries, materials, textures, and the renderer.
     */
    dispose() {
        this.stop();

        // Remove event listeners
        window.removeEventListener('resize', this._handleResize);
        this.container.removeEventListener('click', this._handleClick);
        this.container.removeEventListener('touchstart', this._handleTouch);

        // Dispose tracked game objects
        this.gameObjects.forEach(obj => {
            this.scene.remove(obj);
            this._disposeObject(obj);
        });
        this.gameObjects = [];

        // Dispose everything else in the scene
        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }

        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }

    // ==========================================
    // Setup Methods (override for customization)
    // ==========================================

    /** Set up the Three.js scene. Override for custom background/fog. */
    _setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a3e);
        this.scene.fog = new THREE.Fog(0x1a1a3e, 10, 30);
        this.clock = new THREE.Clock();
    }

    /** Set up the camera. Override for different FOV or position. */
    _setupCamera() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
        this.camera.position.set(0, 2, 8);
        this.camera.lookAt(0, 0, 0);
    }

    /** Set up the WebGL renderer. Appends canvas to this.container. */
    _setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(
            this.container.clientWidth || window.innerWidth,
            this.container.clientHeight || window.innerHeight
        );
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }

    /** Default lighting: ambient + directional + fill. Override for custom. */
    _setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(5, 10, 7);
        dir.castShadow = true;
        dir.shadow.mapSize.set(1024, 1024);
        this.scene.add(dir);

        const fill = new THREE.PointLight(0x4488ff, 0.3, 20);
        fill.position.set(-5, 3, 3);
        this.scene.add(fill);
    }

    /** Set up input handlers. */
    _setupInput() {
        this._handleResize = () => this._onResize();
        window.addEventListener('resize', this._handleResize);

        this._handleClick = (e) => this.onClick(e);
        this.container.addEventListener('click', this._handleClick);

        this._handleTouch = (e) => this.onTouchStart(e);
        this.container.addEventListener('touchstart', this._handleTouch, { passive: true });
    }

    // ==========================================
    // Game-Specific Hooks (override in child)
    // ==========================================

    /**
     * Game-specific initialization.
     * Create meshes, set up game state, add UI overlays, etc.
     */
    gameInit() {
        // Override in child class
    }

    /**
     * Per-frame update logic.
     * @param {number} delta   - Time since last frame (seconds)
     * @param {number} elapsed - Total elapsed time (seconds)
     */
    update(delta, elapsed) {
        // Override in child class
    }

    /**
     * Handle click/tap on the game canvas.
     * @param {MouseEvent|TouchEvent} event
     */
    onClick(event) {
        // Override in child class
    }

    /**
     * Handle touch start on the game canvas.
     * @param {TouchEvent} event
     */
    onTouchStart(event) {
        // Override in child class
    }

    // ==========================================
    // Animation Loop
    // ==========================================

    _animate() {
        if (!this.isRunning) return;

        this._rafId = requestAnimationFrame(() => this._animate());

        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        this.update(delta, elapsed);
        this.renderer.render(this.scene, this.camera);
    }

    // ==========================================
    // Utilities
    // ==========================================

    /**
     * Add a mesh to the scene and track it for cleanup.
     * @param {THREE.Mesh} mesh
     * @returns {THREE.Mesh}
     */
    addGameObject(mesh) {
        this.scene.add(mesh);
        this.gameObjects.push(mesh);
        return mesh;
    }

    /**
     * Remove a tracked game object from the scene.
     * @param {THREE.Mesh} mesh
     */
    removeGameObject(mesh) {
        this.scene.remove(mesh);
        const idx = this.gameObjects.indexOf(mesh);
        if (idx > -1) this.gameObjects.splice(idx, 1);
    }

    /**
     * Create a colored sphere.
     * @param {number} radius
     * @param {number} color - hex like 0xFF6B6B
     * @param {THREE.Vector3} [position]
     * @returns {THREE.Mesh}
     */
    createSphere(radius, color, position = new THREE.Vector3()) {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const mat = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.castShadow = true;
        return mesh;
    }

    /**
     * Create a colored box.
     * @param {number} size
     * @param {number} color
     * @param {THREE.Vector3} [position]
     * @returns {THREE.Mesh}
     */
    createBox(size, color, position = new THREE.Vector3()) {
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshPhongMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.castShadow = true;
        return mesh;
    }

    /**
     * Attach floating animation parameters to a mesh.
     * Call applyFloat(mesh, time) in update() to animate it.
     * @param {THREE.Mesh} mesh
     * @param {number} amplitude - vertical bob amplitude
     * @param {number} speed - float speed multiplier
     */
    createFloatAnimation(mesh, amplitude = 0.3, speed = 1) {
        mesh.userData.floatOffset = Math.random() * Math.PI * 2;
        mesh.userData.floatAmplitude = amplitude;
        mesh.userData.floatSpeed = speed;
        mesh.userData.baseY = mesh.position.y;
    }

    /**
     * Apply the floating animation to a mesh for the current frame.
     * @param {THREE.Mesh} mesh
     * @param {number} time - elapsed time in seconds
     */
    applyFloat(mesh, time) {
        if (mesh.userData.floatAmplitude !== undefined) {
            mesh.position.y = mesh.userData.baseY +
                Math.sin(time * mesh.userData.floatSpeed + mesh.userData.floatOffset) *
                mesh.userData.floatAmplitude;
        }
    }

    /**
     * Handle window resize: update camera aspect and renderer size.
     */
    _onResize() {
        const w = this.container.clientWidth || window.innerWidth;
        const h = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    /**
     * Dispose a single object's geometry and materials.
     * @param {THREE.Object3D} obj
     */
    _disposeObject(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }
}
