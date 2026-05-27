/* 
 * 科技射击游戏 - Babylon.js 版本
 * 控制：WASD移动，鼠标左键射击，R换弹
 */

// 全局变量
let engine, scene, camera;
let playerHealth = 100;
let score = 0;
let kills = 0;
let currentAmmo = 30;
const maxAmmo = 30;
let isReloading = false;
let shootCooldown = false;
const shootDelay = 150;
let enemies = [];
let pillars = [];
let particlesMesh;
let keyState = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
let moveSpeed = 7.5;
let lastTimestamp = 0;
let spawnTimer = 0;

// UI 元素引用
let scoreElem, killCountElem, currentAmmoElem, healthFillElem, healthTextElem;
let damageOverlay, killFeedDiv, gameOverPanel, finalStats, restartBtn;

// 初始化游戏
function initGame() {
    // 获取UI元素
    scoreElem = document.getElementById('scoreValue');
    killCountElem = document.getElementById('killCount');
    currentAmmoElem = document.getElementById('currentAmmo');
    healthFillElem = document.getElementById('healthFill');
    healthTextElem = document.getElementById('healthText');
    damageOverlay = document.getElementById('damageOverlay');
    killFeedDiv = document.getElementById('killFeed');
    gameOverPanel = document.getElementById('gameOverPanel');
    finalStats = document.getElementById('finalStats');
    restartBtn = document.getElementById('restartBtn');

    // 初始化 Babylon.js 引擎
    const canvas = document.getElementById('renderCanvas');
    engine = new BABYLON.Engine(canvas, true);

    // 创建场景
    scene = createScene();

    // 注册渲染循环
    engine.runRenderLoop(() => {
        if (scene && scene.activeCamera) {
            updateGame(engine.getDeltaTime() / 1000);
            scene.render();
        }
    });

    // 窗口大小调整
    window.addEventListener('resize', () => {
        engine.resize();
    });

    // 绑定事件
    setupEventListeners();

    // 更新初始UI
    updateUI();

    console.log("科技射击游戏已启动 | 单击画面锁定鼠标 | WASD移动 | 鼠标左键射击 | R换弹");
}

// 创建场景
function createScene() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.02, 0.04, 0.1, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.008;
    scene.fogColor = new BABYLON.Color3(0.02, 0.04, 0.1);

    // 环境光
    const ambientLight = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.4;

    // 主光源
    const mainLight = new BABYLON.DirectionalLight("mainLight", new BABYLON.Vector3(5, 10, 7), scene);
    mainLight.intensity = 1;

    // 背光
    const backLight = new BABYLON.PointLight("backLight", new BABYLON.Vector3(0, 5, -5), scene);
    backLight.diffuse = new BABYLON.Color3(0.13, 0.4, 1);
    backLight.intensity = 0.5;

    // 填充光
    const fillLight = new BABYLON.PointLight("fillLight", new BABYLON.Vector3(3, 2, 4), scene);
    fillLight.diffuse = new BABYLON.Color3(1, 0.27, 0.67);
    fillLight.intensity = 0.3;

    // 科技感网格地面
    const gridHelper = BABYLON.MeshBuilder.CreateGrid("grid", { size: 200, subdivisions: 50 }, scene);
    gridHelper.position.y = -0.5;
    const gridMaterial = new BABYLON.StandardMaterial("gridMat", scene);
    gridMaterial.emissiveColor = new BABYLON.Color3(0, 0.8, 1);
    gridMaterial.alpha = 0.35;
    gridHelper.material = gridMaterial;

    // 地板
    const floorPlane = BABYLON.MeshBuilder.CreatePlane("floor", { size: 80 }, scene);
    floorPlane.rotation.x = Math.PI / 2;
    floorPlane.position.y = -0.4;
    const floorMaterial = new BABYLON.StandardMaterial("floorMat", scene);
    floorMaterial.diffuseColor = new BABYLON.Color3(0.07, 0.13, 0.2);
    floorMaterial.specularColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    floorMaterial.alpha = 0.6;
    floorPlane.material = floorMaterial;

    // 动态粒子系统
    const particleSystem = new BABYLON.ParticleSystem("particles", 1200, scene);
    particleSystem.particleTexture = new BABYLON.Texture("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", scene);
    particleSystem.emitter = new BABYLON.Vector3(0, 2, 0);
    particleSystem.minEmitBox = new BABYLON.Vector3(-75, 0, -30);
    particleSystem.maxEmitBox = new BABYLON.Vector3(75, 0, 30);
    particleSystem.color1 = new BABYLON.Color4(0.2, 0.67, 1, 1);
    particleSystem.color2 = new BABYLON.Color4(0.1, 0.4, 0.8, 1);
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.15;
    particleSystem.minLifeTime = 999999;
    particleSystem.maxLifeTime = 999999;
    particleSystem.emitRate = 0;
    particleSystem.manualEmitCount = 1200;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    particleSystem.start();
    particlesMesh = particleSystem;

    // 科技柱体
    for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        const radius = 18;
        
        const pillar = BABYLON.MeshBuilder.CreateCylinder("pillar" + i, { diameterTop: 1, diameterBottom: 1.4, height: 2.5, tessellation: 8 }, scene);
        pillar.position.x = Math.cos(angle) * radius;
        pillar.position.z = Math.sin(angle) * radius;
        pillar.position.y = 0.8;
        
        const pillarMat = new BABYLON.StandardMaterial("pillarMat" + i, scene);
        pillarMat.diffuseColor = new BABYLON.Color3(0.2, 0.67, 1);
        pillarMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        pillarMat.emissiveColor = new BABYLON.Color3(0, 0.27, 0.4);
        pillar.material = pillarMat;
        
        pillars.push(pillar);
        
        // 环形灯
        const ringLight = BABYLON.MeshBuilder.CreateTorus("ring" + i, { diameter: 1.3, thickness: 0.1, tessellation: 40 }, scene);
        ringLight.parent = pillar;
        ringLight.position.y = 1.2;
        
        const ringMat = new BABYLON.StandardMaterial("ringMat" + i, scene);
        ringMat.diffuseColor = new BABYLON.Color3(1, 0.27, 0.8);
        ringMat.emissiveColor = new BABYLON.Color3(0.27, 0.07, 0.2);
        ringLight.material = ringMat;
    }

    // 相机 - 使用 UniversalCamera 模拟 PointerLockControls
    camera = new BABYLON.UniversalCamera("playerCamera", new BABYLON.Vector3(0, 1.6, 0), scene);
    camera.setTarget(new BABYLON.Vector3(0, 1.6, 1));
    camera.fov = 1.0;
    camera.minZ = 0.1;
    camera.maxZ = 1000;
    
    // 设置相机控制
    camera.attachControl(document.getElementById('renderCanvas'), true);
    camera.speed = 0.5;
    camera.inertia = 0.85;
    camera.checkCollisions = false;
    
    // 限制相机旋转只允许水平方向（第一人称）
    camera.lowerBetaLimit = null;
    camera.upperBetaLimit = null;
    camera.lowerAlphaLimit = null;
    camera.upperAlphaLimit = null;

    return scene;
}

// 设置事件监听器
function setupEventListeners() {
    const canvas = document.getElementById('renderCanvas');
    
    // 键盘事件
    window.addEventListener('keydown', (e) => {
        if (keyState.hasOwnProperty(e.code)) {
            keyState[e.code] = true;
        }
        if (e.code === 'KeyR') {
            reloadWeapon();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (keyState.hasOwnProperty(e.code)) {
            keyState[e.code] = false;
        }
    });

    // 鼠标点击射击
    canvas.addEventListener('click', () => {
        if (!document.pointerLockElement) {
            canvas.requestPointerLock();
        } else if (!gameOverPanel.classList.contains('hidden')) {
            // 如果游戏结束，不射击
            return;
        } else {
            shoot();
        }
    });

    // 重启按钮
    restartBtn.addEventListener('click', () => {
        restartGame();
    });

    // 指针锁定状态变化
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            camera.attachControl(canvas, true);
        } else {
            camera.detachControl(canvas);
        }
    });
}

// 更新 UI
function updateUI() {
    if (scoreElem) scoreElem.innerText = Math.floor(score);
    if (killCountElem) killCountElem.innerText = kills;
    if (currentAmmoElem) currentAmmoElem.innerText = currentAmmo;
    
    if (healthFillElem && healthTextElem) {
        let healthPercent = Math.max(0, (playerHealth / 100)) * 100;
        healthFillElem.style.width = healthPercent + '%';
        healthTextElem.innerText = `🛡️ 装甲强度：${Math.floor(playerHealth)}`;
        healthTextElem.style.color = playerHealth <= 25 ? "#ff6666" : "#faa";
    }
}

// 添加击杀消息
function addKillMessage(enemyName) {
    if (!killFeedDiv) return;
    const entry = document.createElement('div');
    entry.className = 'kill-entry';
    entry.innerHTML = `🔫 击杀 ${enemyName}  +25 积分`;
    killFeedDiv.appendChild(entry);
    setTimeout(() => entry.remove(), 2000);
}

// 应用伤害
function applyDamage(amount) {
    playerHealth = Math.max(0, playerHealth - amount);
    updateUI();
    
    if (damageOverlay) {
        damageOverlay.style.opacity = '0.4';
        setTimeout(() => { damageOverlay.style.opacity = '0'; }, 150);
    }
    
    if (playerHealth <= 0) {
        gameOver();
    }
}

// 换弹
function reloadWeapon() {
    if (isReloading || currentAmmo === maxAmmo) return;
    isReloading = true;
    
    if (currentAmmoElem) {
        currentAmmoElem.style.color = "#ffaa66";
    }
    
    setTimeout(() => {
        currentAmmo = maxAmmo;
        isReloading = false;
        if (currentAmmoElem) {
            currentAmmoElem.style.color = "#ffaa44";
        }
        updateUI();
    }, 1000);
}

// 射击
function shoot() {
    if (isReloading || shootCooldown) return;
    if (currentAmmo <= 0) {
        if (currentAmmoElem) {
            currentAmmoElem.style.transform = "scale(1.1)";
            setTimeout(() => currentAmmoElem.style.transform = "", 150);
        }
        return;
    }
    
    currentAmmo--;
    updateUI();
    shootCooldown = true;
    setTimeout(() => { shootCooldown = false; }, shootDelay);
    
    // 枪口闪光
    const flashLight = new BABYLON.PointLight("muzzleFlash", new BABYLON.Vector3(0.5, -0.2, -1.2), scene);
    flashLight.diffuse = new BABYLON.Color3(1, 0.4, 0);
    flashLight.intensity = 2;
    flashLight.parent = camera;
    setTimeout(() => {
        flashLight.dispose();
    }, 80);
    
    // 射线检测
    const rayOrigin = camera.position;
    const rayDirection = camera.getForwardDirection();
    const ray = new BABYLON.Ray(rayOrigin, rayDirection, 100);
    
    // 检查与敌人的碰撞
    let hitEnemy = null;
    let hitPoint = null;
    
    for (let enemy of enemies) {
        const mesh = enemy.mesh;
        const boundingInfo = mesh.getBoundingInfo();
        const boundingSphere = boundingInfo.boundingSphere;
        
        const result = ray.intersectsSphere(boundingSphere);
        if (result) {
            // 更精确的检测
            const pickResult = scene.pickWithRay(ray, (mesh) => mesh === enemy.mesh);
            if (pickResult.hit) {
                hitEnemy = enemy;
                hitPoint = pickResult.pickedPoint;
                break;
            }
        }
    }
    
    if (hitEnemy) {
        hitEnemy.health -= 45;
        
        // 命中特效
        const hitEffect = BABYLON.MeshBuilder.CreateSphere("hitEffect", { diameter: 0.4 }, scene);
        hitEffect.position = hitPoint;
        const hitMat = new BABYLON.StandardMaterial("hitMat", scene);
        hitMat.diffuseColor = new BABYLON.Color3(1, 0.2, 0.4);
        hitMat.emissiveColor = new BABYLON.Color3(1, 0.13, 0);
        hitEffect.material = hitMat;
        
        setTimeout(() => {
            hitEffect.dispose();
        }, 150);
        
        if (hitEnemy.health <= 0) {
            // 击杀
            const idx = enemies.indexOf(hitEnemy);
            if (idx !== -1) {
                hitEnemy.mesh.dispose();
                enemies.splice(idx, 1);
                kills++;
                score += 25;
                addKillMessage("幽灵猎手");
                updateUI();
                
                // 随机掉落弹药
                if (Math.random() < 0.4) {
                    currentAmmo = Math.min(maxAmmo, currentAmmo + 8);
                    updateUI();
                    addKillMessage("弹药补给 +8");
                }
            }
        } else {
            // 受击闪烁
            hitEnemy.mesh.material.emissiveColor = new BABYLON.Color3(0.4, 0.1, 0.1);
            setTimeout(() => {
                if (hitEnemy.mesh && hitEnemy.mesh.material) {
                    hitEnemy.mesh.material.emissiveColor = new BABYLON.Color3(0.27, 0.07, 0.13);
                }
            }, 150);
        }
    }
}

// 创建敌人
function createEnemy(x, z) {
    const group = new BABYLON.TransformNode("enemyGroup");
    
    // 主体
    const body = BABYLON.MeshBuilder.CreateBox("enemyBody", { size: 0.8 }, scene);
    body.parent = group;
    const bodyMat = new BABYLON.StandardMaterial("enemyBodyMat", scene);
    bodyMat.diffuseColor = new BABYLON.Color3(0.87, 0.13, 0.33);
    bodyMat.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
    bodyMat.emissiveColor = new BABYLON.Color3(0.27, 0.07, 0.13);
    body.material = bodyMat;
    
    // 环
    const ring = BABYLON.MeshBuilder.CreateTorus("enemyRing", { diameter: 1.2, thickness: 0.14, tessellation: 32 }, scene);
    ring.parent = group;
    ring.rotation.x = Math.PI / 2;
    const ringMat = new BABYLON.StandardMaterial("enemyRingMat", scene);
    ringMat.diffuseColor = new BABYLON.Color3(0.2, 0.8, 1);
    ringMat.emissiveColor = new BABYLON.Color3(0, 0.53, 0.67);
    ring.material = ringMat;
    
    // 天线
    const antenna = BABYLON.MeshBuilder.CreateCylinder("enemyAntenna", { diameterTop: 0.16, diameterBottom: 0.24, height: 0.5, tessellation: 6 }, scene);
    antenna.parent = group;
    antenna.position.y = 0.5;
    const antennaMat = new BABYLON.StandardMaterial("enemyAntennaMat", scene);
    antennaMat.diffuseColor = new BABYLON.Color3(1, 0.67, 0.27);
    antennaMat.emissiveColor = new BABYLON.Color3(0.27, 0.13, 0);
    antenna.material = antennaMat;
    
    group.position = new BABYLON.Vector3(x, 0.4, z);
    
    return {
        mesh: group,
        health: 70,
        speed: 2.2,
        damage: 14,
        attackCooldown: 0
    };
}

// 游戏更新逻辑
function updateGame(deltaTime) {
    if (playerHealth <= 0) return;
    
    const dt = Math.min(deltaTime, 0.033);
    
    // 玩家移动
    if (document.pointerLockElement) {
        const actualSpeed = moveSpeed * dt;
        const forward = camera.getForwardDirection();
        forward.y = 0;
        forward.normalize();
        
        const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());
        right.normalize();
        
        let moveX = 0;
        let moveZ = 0;
        
        if (keyState.KeyW) moveZ -= 1;
        if (keyState.KeyS) moveZ += 1;
        if (keyState.KeyD) moveX += 1;
        if (keyState.KeyA) moveX -= 1;
        
        if (moveX !== 0 || moveZ !== 0) {
            const moveVec = BABYLON.Vector3.Normalize(new BABYLON.Vector3(moveX, 0, moveZ));
            const displacement = forward.scale(-moveVec.z).add(right.scale(moveVec.x)).scale(actualSpeed);
            camera.position.addInPlace(displacement);
        }
        
        // 边界限制
        const limit = 32;
        camera.position.x = Math.min(limit, Math.max(-limit, camera.position.x));
        camera.position.z = Math.min(limit, Math.max(-limit, camera.position.z));
    }
    
    // 敌人 AI
    const playerPos = camera.position;
    for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        const direction = playerPos.subtract(e.mesh.position);
        direction.y = 0;
        direction.normalize();
        
        e.mesh.position.x += direction.x * e.speed * dt;
        e.mesh.position.z += direction.z * e.speed * dt;
        
        // 面向玩家
        e.mesh.lookAt(new BABYLON.Vector3(playerPos.x, e.mesh.position.y, playerPos.z));
        
        // 攻击冷却
        if (e.attackCooldown <= 0) {
            const dist = BABYLON.Vector3.Distance(e.mesh.position, playerPos);
            if (dist < 2.2) {
                applyDamage(e.damage);
                e.attackCooldown = 0.8;
                
                // 击退效果
                const knockDir = e.mesh.position.subtract(playerPos).normalize();
                camera.position.x += knockDir.x * 1.2;
                camera.position.z += knockDir.z * 1.2;
            }
        } else {
            e.attackCooldown -= dt;
        }
    }
    
    // 动态生成敌人
    spawnTimer += dt;
    if (spawnTimer > 5.0 && enemies.length < 12) {
        spawnTimer = 0;
        const side = Math.floor(Math.random() * 4);
        const range = 22;
        let x, z;
        
        if (side === 0) { x = -range; z = (Math.random() - 0.5) * range * 1.5; }
        else if (side === 2) { x = range; z = (Math.random() - 0.5) * range * 1.5; }
        else if (side === 1) { z = -range; x = (Math.random() - 0.5) * range * 1.5; }
        else { z = range; x = (Math.random() - 0.5) * range * 1.5; }
        
        enemies.push(createEnemy(x, z));
    }
    
    // 柱子动画
    pillars.forEach((p, idx) => {
        p.getChildren()[0].rotation.z += 0.01;
    });
}

// 游戏结束
function gameOver() {
    if (!gameOverPanel.classList.contains('hidden')) return;
    
    document.exitPointerLock();
    gameOverPanel.classList.remove('hidden');
    finalStats.innerHTML = `⚡ 最终积分：${Math.floor(score)}<br>💀 消灭敌人：${kills}`;
}

// 重启游戏
function restartGame() {
    // 重置状态
    playerHealth = 100;
    score = 0;
    kills = 0;
    currentAmmo = 30;
    isReloading = false;
    shootCooldown = false;
    
    // 清除敌人
    enemies.forEach(e => e.mesh.dispose());
    enemies = [];
    
    // 重新生成敌人
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = 9 + Math.random() * 12;
        const x = Math.cos(angle) * rad;
        const z = Math.sin(angle) * rad;
        enemies.push(createEnemy(x, z));
    }
    
    // 重置相机位置
    camera.position = new BABYLON.Vector3(0, 1.6, 0);
    camera.setTarget(new BABYLON.Vector3(0, 1.6, 1));
    
    updateUI();
    gameOverPanel.classList.add('hidden');
    spawnTimer = 0;
    
    // 重新请求指针锁定
    const canvas = document.getElementById('renderCanvas');
    canvas.requestPointerLock();
}

// 导出供 HTML 使用
window.initBabylonGame = initGame;
