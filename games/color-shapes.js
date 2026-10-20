/**
 * Color Shapes — Demo Game
 * A simple, fun game that demonstrates the BaseGame architecture.
 *
 * Gameplay:
 *   - Six colorful 3D shapes float in a dark space
 *   - Tap/click a shape to:
 *     • Change it to a random color
 *     • Make it spin faster briefly
 *     • Bounce it (scale pulse)
 *     • Play a pop sound
 *
 * This proves the full pipeline:
 *   menu → launch → 3D scene → interaction → sound → back to menu
 */

class ColorShapesGame extends BaseGame {
    constructor(container) {
        super(container);
        this.shapes = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this._titleEl = null;
    }

    // ==========================================
    // Game Init
    // ==========================================

    gameInit() {
        // Dark space background
        this.scene.background = new THREE.Color(0x0f0f23);
        this.scene.fog = new THREE.Fog(0x0f0f23, 8, 25);

        // --- Create 6 colorful shapes ---
        const configs = [
            { type: 'sphere',       color: 0xFF6B6B, pos: [-3,  0,    0]    },
            { type: 'box',          color: 0xFFA94D, pos: [ 3,  0.5,  -1]  },
            { type: 'torus',        color: 0xFFD43B, pos: [ 0,  2.5,  -2]  },
            { type: 'icosahedron',  color: 0x69DB7C, pos: [-2, -1.5,   1]  },
            { type: 'cone',         color: 0x4DABF7, pos: [ 2, -1,     1.5]},
            { type: 'octahedron',   color: 0x7950F2, pos: [ 0,  0,     2]  }
        ];

        configs.forEach(cfg => {
            const mesh = this._createShape(cfg);
            this.addGameObject(mesh);
            this.createFloatAnimation(mesh, 0.3, 0.8 + Math.random() * 0.4);

            mesh.userData.spinAxis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            mesh.userData.spinSpeed = 0.3 + Math.random() * 0.3;

            this.shapes.push(mesh);
        });

        // --- Ground circle for spatial context ---
        const groundGeo = new THREE.CircleGeometry(8, 32);
        const groundMat = new THREE.MeshPhongMaterial({
            color: 0x1a1a40,
            transparent: true,
            opacity: 0.5
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -3;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // --- Title overlay ---
        this._titleEl = document.createElement('div');
        this._titleEl.className = 'game-title-overlay';
        this._titleEl.innerHTML = '<span>🎨</span> Color Shapes';
        this.container.appendChild(this._titleEl);

        // Sparkle on load
        setTimeout(() => SoundManager.play('sparkle'), 500);
    }

    /**
     * Create a shape mesh based on config.
     * @param {{type: string, color: number, pos: number[]}} cfg
     * @returns {THREE.Mesh}
     */
    _createShape(cfg) {
        let geo;
        switch (cfg.type) {
            case 'sphere':       geo = new THREE.SphereGeometry(0.8, 32, 32); break;
            case 'box':          geo = new THREE.BoxGeometry(1.2, 1.2, 1.2); break;
            case 'torus':        geo = new THREE.TorusGeometry(0.6, 0.25, 16, 48); break;
            case 'icosahedron':  geo = new THREE.IcosahedronGeometry(0.7, 0); break;
            case 'cone':         geo = new THREE.ConeGeometry(0.7, 1.2, 8); break;
            case 'octahedron':   geo = new THREE.OctahedronGeometry(0.7, 0); break;
            default:             geo = new THREE.SphereGeometry(0.8, 32, 32);
        }

        const mat = new THREE.MeshPhongMaterial({
            color: cfg.color,
            shininess: 100,
            transparent: true,
            opacity: 0.95
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
        mesh.castShadow = true;
        return mesh;
    }

    // ==========================================
    // Per-Frame Update
    // ==========================================

    update(delta, elapsed) {
        for (const shape of this.shapes) {
            // Gentle continuous rotation
            const spin = shape.userData.spinAxis.clone().multiplyScalar(delta * shape.userData.spinSpeed);
            shape.rotation.x += spin.x;
            shape.rotation.y += spin.y;
            shape.rotation.z += spin.z;

            // Floating bob
            this.applyFloat(shape, elapsed);
        }
    }

    // ==========================================
    // Interaction
    // ==========================================

    onClick(event) {
        // Normalize mouse coords to NDC (-1 to 1)
        this.mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.shapes);

        if (intersects.length > 0) {
            const shape = intersects[0].object;

            // 1. Random new color (bright, kid-friendly)
            const hue = Math.random();
            const newColor = new THREE.Color().setHSL(hue, 0.85, 0.6);
            shape.material.color.set(newColor);

            // 2. Spin boost (lasts 500ms)
            shape.userData.spinSpeed *= 3;
            setTimeout(() => { shape.userData.spinSpeed /= 3; }, 500);

            // 3. Scale bounce (1.3 → 1.0 over 150ms)
            shape.scale.setScalar(1.3);
            setTimeout(() => shape.scale.setScalar(1), 150);

            // 4. Sound
            SoundManager.play('pop');
        }
    }

    // ==========================================
    // Cleanup
    // ==========================================

    dispose() {
        // Remove the title overlay
        if (this._titleEl && this._titleEl.parentNode) {
            this._titleEl.parentNode.removeChild(this._titleEl);
            this._titleEl = null;
        }
        super.dispose();
    }
}

// Register with the game manager
// GAMES[0] is the "color-shapes" entry (index 0)
if (typeof GAMES !== 'undefined') {
    GAMES[0].gameClass = ColorShapesGame;
}
