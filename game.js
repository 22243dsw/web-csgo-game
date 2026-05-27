/**
 * 森林枪战 - 第一人称射击游戏
 * 使用 Three.js 和 PointerLockControls
 */

class ForestShooterGame {
    constructor() {
        // 场景、相机、渲染器
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // 游戏对象
        this.weaponGroup = null;
        this.muzzleFlash = null;
        this.enemies = [];
        this.treePositions = [];
        
        // 玩家状态
        this.player = {
            position: new THREE.Vector3(0, 1.65, 0),
            speed: 4.8,
            health: 100,
            score: 0,
            invincibleTimer: 0
        };
        
        // 输入状态
        this.keyState = { KeyW: false, KeyS: false, KeyA: false, KeyD: false };
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // 游戏状态
        this.maxEnemies = 12;
        this.shootTimer = 0;
        this.enemySpawnDelay = 0;
        this.lastTime = 0;
        this.isPlaying = true;
        
        // DOM 元素
        this.uiElements = {};
    }
    
    // 初始化游戏
    init() {
        this.setupScene();
        this.setupLights();
        this.setupEnvironment();
        this.setupWeapon();
        this.setupControls();
        this.setupUI();
        this.setupEventListeners();
        this.restart();
        this.animate();
    }
    
    // 创建场景
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a2a1f);
        this.scene.fog = new THREE.FogExp2(0x0a2a1f, 0.022);
        
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.08, 180);
        this.camera.position.copy(this.player.position);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
    }
    
    // 设置光照
    setupLights() {
        const ambientLight = new THREE.AmbientLight(0x4c6a4c, 0.62);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xfff0cc, 1.2);
        dirLight.position.set(12, 18, 6);
        dirLight.castShadow = true;
        dirLight.receiveShadow = false;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 35;
        dirLight.shadow.camera.left = -12;
        dirLight.shadow.camera.right = 12;
        dirLight.shadow.camera.top = 12;
        dirLight.shadow.camera.bottom = -12;
        this.scene.add(dirLight);
        
        const fillLight = new THREE.PointLight(0xaa8866, 0.45);
        fillLight.position.set(3, 2, 4);
        this.scene.add(fillLight);
        
        const backLight = new THREE.PointLight(0x6688aa, 0.35);
        backLight.position.set(-5, 4, -6);
        this.scene.add(backLight);
    }
    
    // 创建环境（地面、树木、灌木）
    setupEnvironment() {
        // 地面
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x4a784a, 
            roughness: 0.85, 
            metalness: 0.05 
        });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // 网格
        const gridHelper = new THREE.GridHelper(88, 36, 0x88aa77, 0x446644);
        gridHelper.position.y = -0.12;
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.28;
        this.scene.add(gridHelper);
        
        // 树木
        for (let i = 0; i < 200; i++) {
            let x = (Math.random() - 0.5) * 78;
            let z = (Math.random() - 0.5) * 78;
            if (Math.abs(x) < 6 && Math.abs(z) < 6) continue;
            
            let tooClose = false;
            for (let p of this.treePositions) {
                if (Math.hypot(p.x - x, p.z - z) < 1.7) { 
                    tooClose = true; 
                    break; 
                }
            }
            if (tooClose) continue;
            
            const tree = this.createTree(x, z);
            this.scene.add(tree);
            this.treePositions.push({ x, z, radius: 0.85 });
        }
        
        // 灌木
        const bushMat = new THREE.MeshStandardMaterial({ color: 0x6aab4a });
        for (let i = 0; i < 280; i++) {
            let x = (Math.random() - 0.5) * 80;
            let z = (Math.random() - 0.5) * 80;
            if (Math.abs(x) < 5 && Math.abs(z) < 5) continue;
            
            const bush = new THREE.Mesh(
                new THREE.SphereGeometry(0.22 + Math.random() * 0.18, 5), 
                bushMat
            );
            bush.position.set(x, -0.12, z);
            bush.castShadow = true;
            this.scene.add(bush);
        }
    }
    
    // 创建单棵树
    createTree(x, z) {
        const group = new THREE.Group();
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.7 });
        
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.85, 1.9, 6), trunkMat);
        trunk.castShadow = true;
        trunk.position.y = 0.95;
        group.add(trunk);
        
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x5c9e3e, roughness: 0.4 });
        
        const leaf1 = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.4, 8), leafMat);
        leaf1.position.y = 1.95;
        leaf1.castShadow = true;
        group.add(leaf1);
        
        const leaf2 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.2, 8), leafMat);
        leaf2.position.y = 2.85;
        leaf2.castShadow = true;
        group.add(leaf2);
        
        const leaf3 = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.0, 8), leafMat);
        leaf3.position.y = 3.65;
        leaf3.castShadow = true;
        group.add(leaf3);
        
        group.position.set(x, -0.15, z);
        return group;
    }
    
    // 创建武器
    setupWeapon() {
        this.weaponGroup = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x353a44, metalness: 0.7, roughness: 0.3 });
        
        const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.72), bodyMat);
        gunBody.position.set(0.4, -0.26, -0.58);
        gunBody.castShadow = true;
        
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.09, 0.68, 8), 
            new THREE.MeshStandardMaterial({ color: 0x666c77, metalness: 0.8 })
        );
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0.59, -0.19, -0.89);
        
        const sight = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.09, 0.12), 
            new THREE.MeshStandardMaterial({ color: 0xcc6644 })
        );
        sight.position.set(0.44, -0.11, -0.98);
        
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.32), bodyMat);
        stock.position.set(0.18, -0.24, -0.34);
        
        this.weaponGroup.add(gunBody, barrel, sight, stock);
        
        // 枪口火花
        this.muzzleFlash = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 6, 6), 
            new THREE.MeshStandardMaterial({ 
                color: 0xffaa55, 
                emissive: 0xff4400, 
                emissiveIntensity: 1.2, 
                transparent: true 
            })
        );
        this.muzzleFlash.position.set(0.69, -0.19, -1.15);
        this.muzzleFlash.visible = false;
        this.weaponGroup.add(this.muzzleFlash);
        
        this.camera.add(this.weaponGroup);
        this.weaponGroup.position.set(0.48, -0.34, -0.72);
        this.weaponGroup.rotation.set(0.05, -0.12, 0.09);
    }
    
    // 设置控制器
    setupControls() {
        this.controls = new PointerLockControls(this.camera, document.body);
        
        this.controls.addEventListener('lock', () => {
            document.getElementById('controls-tip').innerHTML = "🔫 鼠标瞄准 + 左键射击<br>WASD 移动 | 敌人来袭!";
        });
        
        this.controls.addEventListener('unlock', () => {
            document.getElementById('controls-tip').innerHTML = "🖱️ 点击画面锁定鼠标<br>WASD 移动 | 瞄准红色敌人";
        });
        
        this.scene.add(this.controls.getObject());
    }
    
    // 设置 UI
    setupUI() {
        this.uiElements = {
            score: document.getElementById('score'),
            health: document.getElementById('health'),
            gameOver: document.getElementById('game-over'),
            finalScore: document.getElementById('final-score'),
            restartBtn: document.getElementById('restart-btn'),
            controlsTip: document.getElementById('controls-tip'),
            damageOverlay: document.getElementById('damage-overlay')
        };
    }
    
    // 设置事件监听
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // 鼠标点击射击
        this.renderer.domElement.addEventListener('click', () => {
            if (this.controls.isLocked) {
                this.shoot();
            } else {
                this.controls.lock();
            }
        });
        
        // 重新开始
        this.uiElements.restartBtn.addEventListener('click', () => this.restart());
        
        // 窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': this.keyState.KeyW = true; break;
            case 'KeyS': this.keyState.KeyS = true; break;
            case 'KeyA': this.keyState.KeyA = true; break;
            case 'KeyD': this.keyState.KeyD = true; break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.keyState.KeyW = false; break;
            case 'KeyS': this.keyState.KeyS = false; break;
            case 'KeyA': this.keyState.KeyA = false; break;
            case 'KeyD': this.keyState.KeyD = false; break;
        }
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // 射击
    shoot() {
        if (this.shootTimer > 0 || this.player.health <= 0) return;
        
        this.shootTimer = 0.15;
        
        // 枪口火花
        this.muzzleFlash.visible = true;
        setTimeout(() => { this.muzzleFlash.visible = false; }, 50);
        
        // 后坐力
        this.weaponGroup.position.z += 0.08;
        
        // 射线检测
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        
        const enemyMeshes = this.enemies.map(e => e.mesh);
        const intersects = raycaster.intersectObjects(enemyMeshes, true);
        
        if (intersects.length > 0) {
            const hitObject = intersects[0].object;
            for (let i = 0; i < this.enemies.length; i++) {
                if (this.enemies[i].mesh === hitObject || this.enemies[i].mesh.children.includes(hitObject)) {
                    this.enemies[i].destroy();
                    this.enemies.splice(i, 1);
                    this.player.score += 10;
                    this.updateUI();
                    break;
                }
            }
        }
    }
    
    // 生成敌人
    spawnEnemy() {
        if (this.enemies.length >= this.maxEnemies) return;
        
        let x, z;
        do {
            x = (Math.random() - 0.5) * 70;
            z = (Math.random() - 0.5) * 70;
        } while (Math.hypot(x, z) < 15);
        
        const enemy = new ForestEnemy(this.scene, x, z);
        this.enemies.push(enemy);
    }
    
    // 受到伤害
    takeDamage(amount) {
        if (this.player.invincibleTimer > 0 || this.player.health <= 0) return;
        
        this.player.health -= amount;
        this.player.invincibleTimer = 0.8;
        this.updateUI();
        
        // 受伤效果
        this.uiElements.damageOverlay.style.opacity = 0.6;
        setTimeout(() => { this.uiElements.damageOverlay.style.opacity = 0; }, 80);
        
        if (this.player.health <= 0) {
            this.gameOver();
        }
    }
    
    // 更新 UI
    updateUI() {
        this.uiElements.score.textContent = this.player.score;
        this.uiElements.health.textContent = Math.max(0, this.player.health);
    }
    
    // 游戏结束
    gameOver() {
        this.isPlaying = false;
        this.controls.unlock();
        this.uiElements.finalScore.textContent = `你的战绩：${this.player.score} - 消灭 ${Math.floor(this.player.score / 10)} 个敌人`;
        this.uiElements.gameOver.style.display = 'flex';
    }
    
    // 重新开始
    restart() {
        // 清除现有敌人
        for (let enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
        
        // 重置玩家状态
        this.player.health = 100;
        this.player.score = 0;
        this.player.position.set(0, 1.65, 0);
        this.player.invincibleTimer = 0;
        
        this.controls.getObject().position.copy(this.player.position);
        this.controls.getObject().rotation.set(0, -Math.PI/4, 0);
        
        this.shootTimer = 0;
        this.enemySpawnDelay = 0;
        this.isPlaying = true;
        
        this.updateUI();
        this.uiElements.gameOver.style.display = 'none';
        
        // 初始生成敌人
        for (let i = 0; i < 5; i++) {
            this.spawnEnemy();
        }
    }
    
    // 更新移动
    updateMovement(delta) {
        if (!this.isPlaying || this.player.health <= 0) return;
        
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        
        // 获取相机方向
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        
        const camRight = new THREE.Vector3();
        camRight.crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
        
        // 计算移动方向
        if (this.keyState.KeyW) direction.add(camDir);
        if (this.keyState.KeyS) direction.sub(camDir);
        if (this.keyState.KeyD) direction.add(camRight);
        if (this.keyState.KeyA) direction.sub(camRight);
        
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(this.player.speed * delta);
            
            const newPos = this.controls.getObject().position.clone().add(direction);
            
            // 碰撞检测
            let collided = false;
            for (let tree of this.treePositions) {
                const dx = newPos.x - tree.x;
                const dz = newPos.z - tree.z;
                if (Math.hypot(dx, dz) < 0.9) {
                    collided = true;
                    break;
                }
            }
            
            if (Math.abs(newPos.x) > 36 || Math.abs(newPos.z) > 36) {
                collided = true;
            }
            
            if (!collided) {
                this.controls.getObject().position.copy(newPos);
            }
        }
        
        this.controls.getObject().position.y = 1.65;
        this.player.position.copy(this.controls.getObject().position);
    }
    
    // 主循环
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const now = performance.now();
        let delta = Math.min(0.033, (now - this.lastTime) / 1000);
        if (delta > 0.001) {
            this.lastTime = now;
        } else {
            return;
        }
        
        if (this.isPlaying && this.player.health > 0) {
            this.updateMovement(delta);
            
            if (this.shootTimer > 0) this.shootTimer -= delta;
            if (this.player.invincibleTimer > 0) this.player.invincibleTimer -= delta;
            
            // 更新敌人
            for (let i = 0; i < this.enemies.length; i++) {
                const enemy = this.enemies[i];
                if (!enemy.active) continue;
                
                enemy.update(delta, this.player.position);
                
                const dist = this.player.position.distanceTo(enemy.mesh.position);
                if (dist < 1.0) {
                    this.takeDamage(enemy.damage);
                    enemy.destroy();
                    this.enemies.splice(i, 1);
                    i--;
                }
            }
            
            // 生成新敌人
            this.enemySpawnDelay += delta;
            if (this.enemySpawnDelay > 1.4 && this.enemies.length < this.maxEnemies) {
                this.enemySpawnDelay = 0;
                this.spawnEnemy();
            }
        }
        
        // 武器摆动效果
        if (this.weaponGroup) {
            this.weaponGroup.position.x = 0.48 + Math.sin(Date.now() * 9) * 0.003;
            this.weaponGroup.rotation.z = 0.09 + Math.sin(Date.now() * 8) * 0.004;
            
            // 恢复后坐力
            this.weaponGroup.position.z = THREE.MathUtils.lerp(this.weaponGroup.position.z, -0.72, 0.1);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// 敌人类
class ForestEnemy {
    constructor(scene, x, z) {
        this.scene = scene;
        this.active = true;
        this.speed = 2.5 + Math.random() * 1.8;
        this.damage = 15;
        this.wobbleOffset = Math.random() * Math.PI * 2;
        
        this.mesh = this.createMesh();
        this.mesh.position.set(x, 0.35, z);
        this.scene.add(this.mesh);
    }
    
    createMesh() {
        const group = new THREE.Group();
        
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0xdd3333, 
            emissive: 0x551111, 
            roughness: 0.3 
        });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 28, 28), bodyMat);
        body.castShadow = true;
        group.add(body);
        
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), eyeMat);
        leftEye.position.set(-0.28, 0.26, 0.62);
        const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), eyeMat);
        rightEye.position.set(0.28, 0.26, 0.62);
        group.add(leftEye, rightEye);
        
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), pupilMat);
        leftPupil.position.set(-0.28, 0.22, 0.81);
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), pupilMat);
        rightPupil.position.set(0.28, 0.22, 0.81);
        group.add(leftPupil, rightPupil);
        
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xaa4422 });
        const hornGeo = new THREE.ConeGeometry(0.22, 0.55, 6);
        const leftHorn = new THREE.Mesh(hornGeo, hornMat);
        leftHorn.position.set(-0.38, 0.59, 0.22);
        const rightHorn = new THREE.Mesh(hornGeo, hornMat);
        rightHorn.position.set(0.38, 0.59, 0.22);
        group.add(leftHorn, rightHorn);
        
        return group;
    }
    
    update(delta, playerPos) {
        if (!this.active) return;
        
        const direction = new THREE.Vector3();
        direction.subVectors(playerPos, this.mesh.position);
        direction.y = 0;
        direction.normalize();
        
        this.mesh.position.add(direction.multiplyScalar(this.speed * delta));
        this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
        
        // 上下浮动
        this.mesh.position.y = 0.35 + Math.sin(Date.now() * 0.004 + this.wobbleOffset) * 0.08;
        
        // 旋转角
        this.mesh.rotation.z = Math.sin(Date.now() * 0.006 + this.wobbleOffset) * 0.12;
    }
    
    destroy() {
        this.active = false;
        this.scene.remove(this.mesh);
        
        // 清理几何体和材质
        this.mesh.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        });
    }
}

// 启动游戏
window.addEventListener('DOMContentLoaded', () => {
    console.log("森林枪战游戏加载中...");
    const game = new ForestShooterGame();
    game.init();
    console.log("游戏已启动 | 森林第一人称射击 | 使用 Three.js + PointerLockControls");
});
