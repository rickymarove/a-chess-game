import { sfx } from './soundEngine.js';

export function initWizardChess() {
    const canvas = document.getElementById('chess-canvas');
    if (!canvas) return;

    if (canvas.__wizardChessInitialized) return;

    const THREE = window.THREE;
    const Chess = window.Chess;

    if (!THREE || !Chess) {
        setTimeout(initWizardChess, 50);
        return;
    }

    canvas.__wizardChessInitialized = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0B0C10);
    scene.fog = new THREE.FogExp2(0x0B0C10, 0.0145);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 120);

    // Board constants: 8x8 grid centered at (0, 0, 0), square size = 1.35 units
    const SQUARE_SIZE = 1.35;
    const BOARD_OFFSET = (8 * SQUARE_SIZE) / 2 - SQUARE_SIZE / 2;
    const TILE_TOP_Y = 0.04;

    function squareToWorld(sq) {
        const file = sq.charCodeAt(0) - 97;
        const rank = 8 - parseInt(sq[1], 10);
        return new THREE.Vector3(
            file * SQUARE_SIZE - BOARD_OFFSET,
            TILE_TOP_Y,
            rank * SQUARE_SIZE - BOARD_OFFSET
        );
    }

    function coordsToSquare(fileIdx, rankIdx) {
        const file = String.fromCharCode(97 + fileIdx);
        const rank = (8 - rankIdx).toString();
        return file + rank;
    }

    // ============================================================================
    // LIGHTING: CATHEDRAL MOONLIGHT, CANDLELIGHT & ARCANE ACCENTS
    // ============================================================================
    const ambientLight = new THREE.AmbientLight(0x282C44, 1.35);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xFFF3DC, 2.1);
    mainLight.position.set(9, 20, 11);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 4;
    mainLight.shadow.camera.far = 42;
    const d = 8.5;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    mainLight.shadow.bias = -0.0005;
    mainLight.shadow.normalBias = 0.02;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x8B5CF6, 1.35);
    rimLight.position.set(-10, 14, -16);
    scene.add(rimLight);

    const cornerLights = [];
    const cornerPositions = [
        [-6.4, 2.2, -6.4],
        [6.4, 2.2, -6.4],
        [-6.4, 2.2, 6.4],
        [6.4, 2.2, 6.4]
    ];
    cornerPositions.forEach(([x, y, z], idx) => {
        const pLight = new THREE.PointLight(idx < 2 ? 0x8B5CF6 : 0xF59E0B, 0.9, 14, 2);
        pLight.position.set(x, y, z);
        scene.add(pLight);
        cornerLights.push(pLight);
    });

    const impactLight = new THREE.PointLight(0xF59E0B, 0, 16, 1.5);
    impactLight.position.set(0, 3, 0);
    scene.add(impactLight);

    // ============================================================================
    // GOTHIC CATHEDRAL ENVIRONMENT
    // ============================================================================
    const cathedralGroup = new THREE.Group();
    scene.add(cathedralGroup);

    const darkStoneMat = new THREE.MeshStandardMaterial({
        color: 0x13151F,
        roughness: 0.78,
        metalness: 0.15
    });

    const ribbedStoneMat = new THREE.MeshStandardMaterial({
        color: 0x1C2030,
        roughness: 0.65,
        metalness: 0.22
    });

    const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        roughness: 0.28,
        metalness: 0.85,
        emissive: 0x3B2104,
        emissiveIntensity: 0.35
    });

    function buildGothicCathedral() {
        const floorGeo = new THREE.CylinderGeometry(45, 45, 0.5, 64);
        const floorMesh = new THREE.Mesh(floorGeo, darkStoneMat);
        floorMesh.position.y = -2.1;
        floorMesh.receiveShadow = true;
        cathedralGroup.add(floorMesh);

        const altarStep1 = new THREE.Mesh(
            new THREE.CylinderGeometry(9.6, 10.4, 0.7, 8),
            ribbedStoneMat
        );
        altarStep1.rotation.y = Math.PI / 8;
        altarStep1.position.y = -1.55;
        altarStep1.receiveShadow = true;
        cathedralGroup.add(altarStep1);

        const altarStep2 = new THREE.Mesh(
            new THREE.CylinderGeometry(8.2, 8.8, 0.75, 8),
            darkStoneMat
        );
        altarStep2.rotation.y = Math.PI / 8;
        altarStep2.position.y = -0.9;
        altarStep2.receiveShadow = true;
        cathedralGroup.add(altarStep2);

        const runeRingGeo = new THREE.RingGeometry(8.35, 8.5, 64);
        const runeRingMat = new THREE.MeshBasicMaterial({
            color: 0xF59E0B,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.32
        });
        const runeRing = new THREE.Mesh(runeRingGeo, runeRingMat);
        runeRing.rotation.x = -Math.PI / 2;
        runeRing.position.y = -1.18;
        cathedralGroup.add(runeRing);

        const numBays = 6;
        const baySpacing = 8.5;
        const aisleX = 16.5;

        for (let i = -numBays / 2; i <= numBays / 2; i++) {
            const zPos = i * baySpacing;

            [-aisleX, aisleX].forEach(xPos => {
                const pillarGroup = new THREE.Group();
                pillarGroup.position.set(xPos, -2, zPos);

                const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 2.4), ribbedStoneMat);
                base.position.y = 0.7;
                pillarGroup.add(base);

                const core = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 22, 12), darkStoneMat);
                core.position.y = 11.7;
                pillarGroup.add(core);

                const shaftOffsets = [[0.75, 0], [-0.75, 0], [0, 0.75], [0, -0.75]];
                shaftOffsets.forEach(([ox, oz]) => {
                    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 22, 8), ribbedStoneMat);
                    shaft.position.set(ox, 11.7, oz);
                    pillarGroup.add(shaft);
                });

                const capital = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 0.9, 1.2, 8), ribbedStoneMat);
                capital.position.y = 22.8;
                pillarGroup.add(capital);

                const sconceX = xPos > 0 ? -1.1 : 1.1;
                const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.12, 0.6, 8), goldTrimMat);
                sconce.position.set(sconceX, 5.2, 0);
                pillarGroup.add(sconce);

                const flame = new THREE.Mesh(
                    new THREE.OctahedronGeometry(0.22, 0),
                    new THREE.MeshBasicMaterial({ color: 0xFBBF24 })
                );
                flame.position.set(sconceX, 5.65, 0);
                pillarGroup.add(flame);

                cathedralGroup.add(pillarGroup);
            });

            const archGroup = new THREE.Group();
            archGroup.position.set(0, 20.8, zPos);

            const leftRib = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 19.5, 8), ribbedStoneMat);
            leftRib.position.set(-7.8, 4.6, 0);
            leftRib.rotation.z = -0.96;
            archGroup.add(leftRib);

            const rightRib = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 19.5, 8), ribbedStoneMat);
            rightRib.position.set(7.8, 4.6, 0);
            rightRib.rotation.z = 0.96;
            archGroup.add(rightRib);

            const boss = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 0), goldTrimMat);
            boss.position.set(0, 10.2, 0);
            archGroup.add(boss);

            cathedralGroup.add(archGroup);
        }

        [-28, 28].forEach((zWall, idx) => {
            const windowGroup = new THREE.Group();
            windowGroup.position.set(0, 9.5, zWall);
            if (idx === 1) windowGroup.rotation.y = Math.PI;

            const roseRing = new THREE.Mesh(
                new THREE.TorusGeometry(5.6, 0.45, 12, 32),
                ribbedStoneMat
            );
            windowGroup.add(roseRing);

            const glassMat = new THREE.MeshBasicMaterial({
                color: idx === 0 ? 0x4C1D95 : 0x78350F,
                transparent: true,
                opacity: 0.38,
                side: THREE.DoubleSide
            });
            const roseGlass = new THREE.Mesh(new THREE.CircleGeometry(5.4, 32), glassMat);
            windowGroup.add(roseGlass);

            for (let s = 0; s < 12; s++) {
                const angle = (s / 12) * Math.PI * 2;
                const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.16, 10.8, 0.25), ribbedStoneMat);
                spoke.rotation.z = angle;
                windowGroup.add(spoke);
            }

            const innerRose = new THREE.Mesh(
                new THREE.TorusGeometry(2.6, 0.2, 8, 24),
                goldTrimMat
            );
            innerRose.position.z = 0.1;
            windowGroup.add(innerRose);

            [-3.6, 0, 3.6].forEach(lx => {
                const lancetFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 9.5, 0.4), ribbedStoneMat);
                lancetFrame.position.set(lx, -10.8, 0);
                windowGroup.add(lancetFrame);

                const lancetGlass = new THREE.Mesh(
                    new THREE.PlaneGeometry(1.6, 8.8),
                    new THREE.MeshBasicMaterial({
                        color: idx === 0 ? 0x6D28D9 : 0xD97706,
                        transparent: true,
                        opacity: 0.28,
                        side: THREE.DoubleSide
                    })
                );
                lancetGlass.position.set(lx, -10.8, 0.05);
                windowGroup.add(lancetGlass);
            });

            cathedralGroup.add(windowGroup);
        });
    }

    buildGothicCathedral();

    // Atmospheric Floating Cathedral Dust Motes
    const dustCount = 180;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
        dustPositions[i * 3] = (Math.random() - 0.5) * 28;
        dustPositions[i * 3 + 1] = Math.random() * 14 - 1;
        dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xFDE68A,
        size: 0.09,
        transparent: true,
        opacity: 0.45
    });
    const dustSystem = new THREE.Points(dustGeo, dustMat);
    scene.add(dustSystem);

    // ============================================================================
    // 64-SQUARE SANCTUARY CHESS BOARD & SPATIAL INDICATORS
    // ============================================================================
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);

    const squareMeshes = [];
    const indicatorMeshes = {};

    const lightTileMat = new THREE.MeshStandardMaterial({
        color: 0xDFD9CE,
        roughness: 0.32,
        metalness: 0.08
    });

    const darkTileMat = new THREE.MeshStandardMaterial({
        color: 0x1D202C,
        roughness: 0.38,
        metalness: 0.18
    });

    function buildChessBoard() {
        const totalGridSize = 8 * SQUARE_SIZE;
        const frameSize = totalGridSize + 1.5;

        const outerFrame = new THREE.Mesh(
            new THREE.BoxGeometry(frameSize, 0.50, frameSize),
            new THREE.MeshStandardMaterial({
                color: 0x141722,
                roughness: 0.5,
                metalness: 0.3
            })
        );
        outerFrame.position.y = -0.30;
        outerFrame.receiveShadow = true;
        boardGroup.add(outerFrame);

        const borderThickness = 0.16;
        const borderHeight = 0.14;
        const borderCenterOffset = totalGridSize / 2 + borderThickness / 2;

        const nsBarGeo = new THREE.BoxGeometry(totalGridSize + borderThickness * 2, borderHeight, borderThickness);
        const ewBarGeo = new THREE.BoxGeometry(borderThickness, borderHeight, totalGridSize);

        const northBar = new THREE.Mesh(nsBarGeo, goldTrimMat);
        northBar.position.set(0, -0.02, -borderCenterOffset);
        northBar.receiveShadow = true;
        boardGroup.add(northBar);

        const southBar = new THREE.Mesh(nsBarGeo, goldTrimMat);
        southBar.position.set(0, -0.02, borderCenterOffset);
        southBar.receiveShadow = true;
        boardGroup.add(southBar);

        const westBar = new THREE.Mesh(ewBarGeo, goldTrimMat);
        westBar.position.set(-borderCenterOffset, -0.02, 0);
        westBar.receiveShadow = true;
        boardGroup.add(westBar);

        const eastBar = new THREE.Mesh(ewBarGeo, goldTrimMat);
        eastBar.position.set(borderCenterOffset, -0.02, 0);
        eastBar.receiveShadow = true;
        boardGroup.add(eastBar);

        const halfFrame = frameSize / 2 - 0.25;
        [
            [-halfFrame, -halfFrame],
            [halfFrame, -halfFrame],
            [-halfFrame, halfFrame],
            [halfFrame, halfFrame]
        ].forEach(([cx, cz]) => {
            const finial = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.35, 0.72, 8),
                goldTrimMat
            );
            finial.position.set(cx, -0.15, cz);
            boardGroup.add(finial);
        });

        const tileGeo = new THREE.BoxGeometry(SQUARE_SIZE * 0.988, 0.12, SQUARE_SIZE * 0.988);

        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
            for (let fileIdx = 0; fileIdx < 8; fileIdx++) {
                const isLight = (rankIdx + fileIdx) % 2 === 0;
                const sqName = coordsToSquare(fileIdx, rankIdx);
                const tileMesh = new THREE.Mesh(tileGeo, isLight ? lightTileMat : darkTileMat);

                const pos = squareToWorld(sqName);
                tileMesh.position.set(pos.x, -0.02, pos.z);
                tileMesh.receiveShadow = true;
                tileMesh.userData = {
                    type: 'square',
                    square: sqName,
                    isLight
                };

                boardGroup.add(tileMesh);
                squareMeshes.push(tileMesh);

                const indGroup = new THREE.Group();
                indGroup.position.set(pos.x, 0.052, pos.z);

                const polyOffsetProps = {
                    polygonOffset: true,
                    polygonOffsetFactor: -2,
                    polygonOffsetUnits: -2,
                    depthWrite: false
                };

                const selRing = new THREE.Mesh(
                    new THREE.RingGeometry(SQUARE_SIZE * 0.38, SQUARE_SIZE * 0.46, 32),
                    new THREE.MeshBasicMaterial({
                        color: 0xF59E0B,
                        side: THREE.DoubleSide,
                        ...polyOffsetProps
                    })
                );
                selRing.rotation.x = -Math.PI / 2;
                selRing.visible = false;
                indGroup.add(selRing);

                const moveRing = new THREE.Mesh(
                    new THREE.RingGeometry(SQUARE_SIZE * 0.12, SQUARE_SIZE * 0.22, 24),
                    new THREE.MeshBasicMaterial({
                        color: 0x10B981,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.9,
                        ...polyOffsetProps
                    })
                );
                moveRing.rotation.x = -Math.PI / 2;
                moveRing.visible = false;
                indGroup.add(moveRing);

                const capRing = new THREE.Mesh(
                    new THREE.RingGeometry(SQUARE_SIZE * 0.36, SQUARE_SIZE * 0.47, 6),
                    new THREE.MeshBasicMaterial({
                        color: 0xEF4444,
                        side: THREE.DoubleSide,
                        transparent: true,
                        opacity: 0.95,
                        ...polyOffsetProps
                    })
                );
                capRing.rotation.x = -Math.PI / 2;
                capRing.visible = false;
                indGroup.add(capRing);

                const lastMovePad = new THREE.Mesh(
                    new THREE.PlaneGeometry(SQUARE_SIZE * 0.92, SQUARE_SIZE * 0.92),
                    new THREE.MeshBasicMaterial({
                        color: 0x8B5CF6,
                        transparent: true,
                        opacity: 0.24,
                        side: THREE.DoubleSide,
                        ...polyOffsetProps
                    })
                );
                lastMovePad.rotation.x = -Math.PI / 2;
                lastMovePad.visible = false;
                indGroup.add(lastMovePad);

                const checkPad = new THREE.Mesh(
                    new THREE.CircleGeometry(SQUARE_SIZE * 0.46, 32),
                    new THREE.MeshBasicMaterial({
                        color: 0xEF4444,
                        transparent: true,
                        opacity: 0.65,
                        side: THREE.DoubleSide,
                        ...polyOffsetProps
                    })
                );
                checkPad.rotation.x = -Math.PI / 2;
                checkPad.visible = false;
                indGroup.add(checkPad);

                boardGroup.add(indGroup);
                indicatorMeshes[sqName] = {
                    group: indGroup,
                    selRing,
                    moveRing,
                    capRing,
                    lastMovePad,
                    checkPad
                };
            }
        }
    }

    buildChessBoard();

    // ============================================================================
    // SCULPTED 3D WIZARD'S CHESS PIECES (MARBLE VS. OBSIDIAN)
    // ============================================================================
    const whiteMarbleMat = new THREE.MeshStandardMaterial({
        color: 0xF5F2EB,
        roughness: 0.24,
        metalness: 0.08
    });

    const whiteAccentMat = new THREE.MeshStandardMaterial({
        color: 0xF59E0B,
        roughness: 0.25,
        metalness: 0.85,
        emissive: 0x78350F,
        emissiveIntensity: 0.35
    });

    const blackObsidianMat = new THREE.MeshStandardMaterial({
        color: 0x161822,
        roughness: 0.14,
        metalness: 0.45
    });

    const blackAccentMat = new THREE.MeshStandardMaterial({
        color: 0x8B5CF6,
        roughness: 0.25,
        metalness: 0.75,
        emissive: 0x4C1D95,
        emissiveIntensity: 0.55
    });

    function createSculptedPieceMesh(type, color) {
        const isWhite = color === 'w';
        const mainMat = isWhite ? whiteMarbleMat : blackObsidianMat;
        const accentMat = isWhite ? whiteAccentMat : blackAccentMat;

        const root = new THREE.Group();
        const baseGroup = new THREE.Group();
        const upperGroup = new THREE.Group();
        const weaponGroup = new THREE.Group();

        root.add(baseGroup);
        root.add(upperGroup);
        upperGroup.add(weaponGroup);

        const plinth1 = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.16, 12), mainMat);
        plinth1.position.y = 0.08;
        plinth1.castShadow = true;
        plinth1.receiveShadow = true;
        baseGroup.add(plinth1);

        const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.032, 8, 24), accentMat);
        goldRing.rotation.x = Math.PI / 2;
        goldRing.position.y = 0.17;
        baseGroup.add(goldRing);

        const plinth2 = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 0.22, 12), mainMat);
        plinth2.position.y = 0.27;
        plinth2.castShadow = true;
        baseGroup.add(plinth2);

        upperGroup.position.y = 0.38;

        if (type === 'p') {
            const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.33, 0.55, 10), mainMat);
            torso.position.y = 0.27;
            torso.castShadow = true;
            upperGroup.add(torso);

            const collar = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.03, 8, 18), accentMat);
            collar.rotation.x = Math.PI / 2;
            collar.position.y = 0.54;
            upperGroup.add(collar);

            const helm = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), mainMat);
            helm.position.y = 0.72;
            helm.castShadow = true;
            upperGroup.add(helm);

            const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.22), accentMat);
            visor.position.set(0, 0.72, isWhite ? -0.14 : 0.14);
            upperGroup.add(visor);

            weaponGroup.position.set(0, 0.35, 0);
            const dirZ = isWhite ? -1 : 1;
            const shield = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.06), accentMat);
            shield.position.set(-0.22, 0.05, dirZ * 0.22);
            upperGroup.add(shield);

            const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.95, 6), accentMat);
            spearShaft.position.set(0.24, 0.2, dirZ * 0.12);
            spearShaft.rotation.x = dirZ * 0.25;
            weaponGroup.add(spearShaft);

            const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 6), mainMat);
            spearTip.position.set(0.24, 0.68, dirZ * 0.24);
            spearTip.rotation.x = dirZ * 0.25;
            weaponGroup.add(spearTip);

        } else if (type === 'r') {
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.92, 8), mainMat);
            tower.position.y = 0.46;
            tower.castShadow = true;
            upperGroup.add(tower);

            const coreBand = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 8), accentMat);
            coreBand.position.y = 0.52;
            upperGroup.add(coreBand);

            weaponGroup.position.set(0, 0.92, 0);
            const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.33, 0.22, 8), mainMat);
            crownBase.castShadow = true;
            weaponGroup.add(crownBase);

            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const crenel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.18), accentMat);
                crenel.position.set(Math.cos(angle) * 0.26, 0.18, Math.sin(angle) * 0.26);
                weaponGroup.add(crenel);
            }

        } else if (type === 'n') {
            const dirZ = isWhite ? -1 : 1;

            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.62, 10), mainMat);
            body.position.y = 0.31;
            body.castShadow = true;
            upperGroup.add(body);

            weaponGroup.position.set(0, 0.55, 0);

            const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.56, 0.34), mainMat);
            neck.position.set(0, 0.22, dirZ * 0.06);
            neck.rotation.x = dirZ * 0.35;
            neck.castShadow = true;
            weaponGroup.add(neck);

            const snout = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.45, 6), mainMat);
            snout.position.set(0, 0.44, dirZ * 0.28);
            snout.rotation.x = dirZ * 1.25;
            snout.castShadow = true;
            weaponGroup.add(snout);

            const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.14), accentMat);
            mane.position.set(0, 0.28, -dirZ * 0.12);
            mane.rotation.x = dirZ * 0.3;
            weaponGroup.add(mane);

        } else if (type === 'b') {
            const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.36, 0.96, 12), mainMat);
            robe.position.y = 0.48;
            robe.castShadow = true;
            upperGroup.add(robe);

            const stole = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 20), accentMat);
            stole.rotation.x = Math.PI / 2;
            stole.position.y = 0.92;
            upperGroup.add(stole);

            const mitre = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.46, 10), mainMat);
            mitre.position.y = 1.18;
            mitre.castShadow = true;
            upperGroup.add(mitre);

            const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), accentMat);
            orb.position.y = 1.45;
            upperGroup.add(orb);

            const dirZ = isWhite ? -1 : 1;
            weaponGroup.position.set(0.24, 0.65, dirZ * 0.15);
            const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.15, 6), accentMat);
            weaponGroup.add(staff);
            const staffGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), accentMat);
            staffGem.position.y = 0.62;
            weaponGroup.add(staffGem);

        } else if (type === 'q') {
            const gown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.39, 1.15, 16), mainMat);
            gown.position.y = 0.57;
            gown.castShadow = true;
            upperGroup.add(gown);

            const waistRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 8, 24), accentMat);
            waistRing.rotation.x = Math.PI / 2;
            waistRing.position.y = 0.85;
            upperGroup.add(waistRing);

            const crownFlare = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.21, 0.28, 12), mainMat);
            crownFlare.position.y = 1.24;
            crownFlare.castShadow = true;
            upperGroup.add(crownFlare);

            const coronet = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 8, 16), accentMat);
            coronet.rotation.x = Math.PI / 2;
            coronet.position.y = 1.4;
            upperGroup.add(coronet);

            const apexOrb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), accentMat);
            apexOrb.position.y = 1.5;
            upperGroup.add(apexOrb);

            const dirZ = isWhite ? -1 : 1;
            weaponGroup.position.set(0.27, 0.78, dirZ * 0.16);
            const scepter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 1.22, 8), accentMat);
            weaponGroup.add(scepter);
            const scepterHead = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 1), mainMat);
            scepterHead.position.y = 0.66;
            weaponGroup.add(scepterHead);

        } else if (type === 'k') {
            const mantle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.41, 1.25, 12), mainMat);
            mantle.position.y = 0.62;
            mantle.castShadow = true;
            upperGroup.add(mantle);

            const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.24, 8), accentMat);
            collar.position.y = 1.26;
            upperGroup.add(collar);

            const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.26, 8), mainMat);
            crown.position.y = 1.48;
            crown.castShadow = true;
            upperGroup.add(crown);

            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.08), accentMat);
            crossV.position.y = 1.72;
            upperGroup.add(crossV);
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), accentMat);
            crossH.position.y = 1.74;
            upperGroup.add(crossH);

            const dirZ = isWhite ? -1 : 1;
            weaponGroup.position.set(0, 0.85, dirZ * 0.26);
            const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.03), accentMat);
            blade.position.y = -0.1;
            weaponGroup.add(blade);
            const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.07), mainMat);
            crossguard.position.y = 0.36;
            weaponGroup.add(crossguard);
        }

        root.userData = {
            type,
            color,
            baseGroup,
            upperGroup,
            weaponGroup,
            idlePhase: Math.random() * Math.PI * 2,
            isSelected: false,
            baseY: 0
        };

        return root;
    }

    // ============================================================================
    // SHATTER & EXPLOSION PHYSICS ENGINE
    // ============================================================================
    const activeShards = [];
    const activeDustPuffs = [];

    function spawnPieceShatter(worldPos, victimColor, victimType, attackDirection) {
        const isWhite = victimColor === 'w';
        const shardMatMain = isWhite ? whiteMarbleMat.clone() : blackObsidianMat.clone();
        const shardMatAccent = isWhite ? whiteAccentMat.clone() : blackAccentMat.clone();
        shardMatMain.transparent = true;
        shardMatAccent.transparent = true;

        const shardCount = 34;
        const dir = attackDirection ? attackDirection.clone().normalize() : new THREE.Vector3(0, 0.5, 1);

        for (let i = 0; i < shardCount; i++) {
            const isRuneShard = i % 4 === 0;
            const radius = isRuneShard ? (0.07 + Math.random() * 0.09) : (0.1 + Math.random() * 0.16);
            const geo = i % 2 === 0
                ? new THREE.DodecahedronGeometry(radius, 0)
                : new THREE.TetrahedronGeometry(radius * 1.2, 0);

            const mesh = new THREE.Mesh(geo, isRuneShard ? shardMatAccent : shardMatMain);

            const spawnY = 0.25 + Math.random() * 1.25;
            mesh.position.set(
                worldPos.x + (Math.random() - 0.5) * 0.45,
                spawnY,
                worldPos.z + (Math.random() - 0.5) * 0.45
            );

            mesh.scale.set(
                0.6 + Math.random() * 0.9,
                0.5 + Math.random() * 1.1,
                0.6 + Math.random() * 0.9
            );

            mesh.castShadow = true;
            scene.add(mesh);

            const spread = new THREE.Vector3(
                (Math.random() - 0.5) * 5.2,
                2.2 + Math.random() * 4.8,
                (Math.random() - 0.5) * 5.2
            );
            const velocity = spread.addScaledVector(dir, 2.8 + Math.random() * 3.2);

            const rotVel = new THREE.Vector3(
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 14
            );

            activeShards.push({
                mesh,
                velocity,
                rotVel,
                age: 0,
                maxAge: 2.8 + Math.random() * 1.1,
                bounces: 0
            });
        }

        spawnDustShockwave(worldPos, isWhite ? 0xF59E0B : 0x8B5CF6, 1.4);
    }

    function spawnDustShockwave(worldPos, hexColor = 0xF59E0B, scaleMult = 1.0) {
        const ringGeo = new THREE.RingGeometry(0.15, 0.32, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: hexColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            depthWrite: false
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(worldPos.x, TILE_TOP_Y + 0.015, worldPos.z);
        scene.add(ringMesh);

        activeDustPuffs.push({
            mesh: ringMesh,
            age: 0,
            maxAge: 0.65,
            scaleMult
        });
    }

    function updateShatterPhysics(dt) {
        const gravity = -15.8;

        for (let i = activeShards.length - 1; i >= 0; i--) {
            const s = activeShards[i];
            s.age += dt;

            if (s.age >= s.maxAge) {
                scene.remove(s.mesh);
                s.mesh.geometry.dispose();
                activeShards.splice(i, 1);
                continue;
            }

            s.velocity.y += gravity * dt;
            s.mesh.position.addScaledVector(s.velocity, dt);

            s.mesh.rotation.x += s.rotVel.x * dt;
            s.mesh.rotation.y += s.rotVel.y * dt;
            s.mesh.rotation.z += s.rotVel.z * dt;

            const floorBounceY = TILE_TOP_Y + 0.04;
            if (s.mesh.position.y < floorBounceY) {
                s.mesh.position.y = floorBounceY;
                s.velocity.y = Math.abs(s.velocity.y) * 0.42;
                s.velocity.x *= 0.72;
                s.velocity.z *= 0.72;
                s.rotVel.multiplyScalar(0.68);
                s.bounces++;
            }

            const lifeRatio = s.age / s.maxAge;
            if (lifeRatio > 0.65) {
                const alpha = 1 - (lifeRatio - 0.65) / 0.35;
                s.mesh.material.opacity = Math.max(0, alpha);
                s.mesh.scale.multiplyScalar(0.985);
            }
        }

        for (let i = activeDustPuffs.length - 1; i >= 0; i--) {
            const p = activeDustPuffs[i];
            p.age += dt;
            if (p.age >= p.maxAge) {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                activeDustPuffs.splice(i, 1);
                continue;
            }
            const progress = p.age / p.maxAge;
            const sc = 1 + progress * 4.2 * p.scaleMult;
            p.mesh.scale.set(sc, sc, 1);
            p.mesh.material.opacity = (1 - progress) * 0.8;
        }
    }

    // ============================================================================
    // CAMERA CONTROLLER
    // ============================================================================
    const camState = {
        theta: 0,
        phi: 0.92,
        radius: 17.2,
        targetTheta: 0,
        targetPhi: 0.92,
        targetRadius: 17.2,
        lookAtPos: new THREE.Vector3(0, 0.4, 0),
        targetLookAt: new THREE.Vector3(0, 0.4, 0),
        autoOrbit: false,
        battleCamEnabled: true,
        shakeIntensity: 0,
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        pointerDownPos: { x: 0, y: 0 }
    };

    function setCameraPreset(presetName) {
        camState.autoOrbit = false;
        camState.targetLookAt.set(0, 0.4, 0);

        if (presetName === 'white') {
            camState.targetTheta = 0;
            camState.targetPhi = 0.92;
            camState.targetRadius = 17.2;
        } else if (presetName === 'black') {
            camState.targetTheta = Math.PI;
            camState.targetPhi = 0.92;
            camState.targetRadius = 17.2;
        } else if (presetName === 'top') {
            camState.targetTheta = 0;
            camState.targetPhi = 0.18;
            camState.targetRadius = 19.5;
        } else if (presetName === 'cinematic') {
            camState.autoOrbit = true;
            camState.targetPhi = 1.05;
            camState.targetRadius = 18.5;
        }

        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cam === presetName);
        });
    }

    function triggerCameraShake(amount = 0.35) {
        camState.shakeIntensity = amount;
    }

    function updateCamera(dt) {
        if (camState.autoOrbit && !camState.isDragging) {
            camState.targetTheta += dt * 0.22;
        }

        const lerpFactor = 1 - Math.exp(-6.5 * dt);
        camState.theta += (camState.targetTheta - camState.theta) * lerpFactor;
        camState.phi += (camState.targetPhi - camState.phi) * lerpFactor;
        camState.radius += (camState.targetRadius - camState.radius) * lerpFactor;
        camState.lookAtPos.lerp(camState.targetLookAt, lerpFactor);

        const x = camState.lookAtPos.x + camState.radius * Math.sin(camState.phi) * Math.sin(camState.theta);
        const y = camState.lookAtPos.y + camState.radius * Math.cos(camState.phi);
        const z = camState.lookAtPos.z + camState.radius * Math.sin(camState.phi) * Math.cos(camState.theta);

        camera.position.set(x, y, z);

        if (camState.shakeIntensity > 0.002) {
            camera.position.x += (Math.random() - 0.5) * camState.shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * camState.shakeIntensity;
            camera.position.z += (Math.random() - 0.5) * camState.shakeIntensity;
            camState.shakeIntensity *= Math.exp(-9.0 * dt);
        } else {
            camState.shakeIntensity = 0;
        }

        camera.lookAt(camState.lookAtPos);
    }

    // ============================================================================
    // GAME STATE, CHESS.JS RULES ENGINE & ANIMATION CHOREOGRAPHER
    // ============================================================================
    const game = new Chess();
    const pieceMeshes = {};

    let selectedSquare = null;
    let legalMovesForSelected = [];
    let lastMoveSquares = [];
    let isAnimatingMove = false;
    let vsAI = true;
    let pendingPromotionMove = null;
    let whiteShatteredCount = 0;
    let blackShatteredCount = 0;
    let activeChoreography = null;

    function syncBoardFromEngine() {
        Object.keys(pieceMeshes).forEach(sq => {
            scene.remove(pieceMeshes[sq]);
            delete pieceMeshes[sq];
        });

        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const cell = boardState[r][f];
                if (cell) {
                    const sq = coordsToSquare(f, r);
                    const mesh = createSculptedPieceMesh(cell.type, cell.color);
                    const worldPos = squareToWorld(sq);
                    mesh.position.copy(worldPos);
                    scene.add(mesh);
                    pieceMeshes[sq] = mesh;
                }
            }
        }
        updateSpatialIndicators();
        updateUIStatus();
    }

    function updateSpatialIndicators() {
        Object.keys(indicatorMeshes).forEach(sq => {
            const ind = indicatorMeshes[sq];
            ind.selRing.visible = false;
            ind.moveRing.visible = false;
            ind.capRing.visible = false;
            ind.lastMovePad.visible = lastMoveSquares.includes(sq);
            ind.checkPad.visible = false;
        });

        Object.keys(pieceMeshes).forEach(sq => {
            pieceMeshes[sq].userData.isSelected = (sq === selectedSquare);
        });

        if (selectedSquare && indicatorMeshes[selectedSquare]) {
            indicatorMeshes[selectedSquare].selRing.visible = true;
        }

        legalMovesForSelected.forEach(move => {
            const targetInd = indicatorMeshes[move.to];
            if (!targetInd) return;
            if (move.captured || move.flags.includes('e')) {
                targetInd.capRing.visible = true;
            } else {
                targetInd.moveRing.visible = true;
            }
        });

        if (game.in_check()) {
            const turnColor = game.turn();
            const board = game.board();
            for (let r = 0; r < 8; r++) {
                for (let f = 0; f < 8; f++) {
                    const p = board[r][f];
                    if (p && p.type === 'k' && p.color === turnColor) {
                        const kingSq = coordsToSquare(f, r);
                        if (indicatorMeshes[kingSq]) {
                            indicatorMeshes[kingSq].checkPad.visible = true;
                        }
                    }
                }
            }
        }
    }

    let toastTimer = null;
    function showToast(message, icon = 'auto_fix_high') {
        const toast = document.getElementById('action-toast');
        const toastText = document.getElementById('toast-text');
        const toastIcon = document.getElementById('toast-icon');
        if (!toast || !toastText || !toastIcon) return;

        toastText.textContent = message;
        toastIcon.textContent = icon;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0px)';

        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
        }, 3400);
    }

    function executeChoreographedMove(moveObj) {
        if (isAnimatingMove) return;

        const result = game.move(moveObj);
        if (!result) return;

        isAnimatingMove = true;
        selectedSquare = null;
        legalMovesForSelected = [];
        lastMoveSquares = [result.from, result.to];
        updateSpatialIndicators();

        const attackerMesh = pieceMeshes[result.from];
        const fromPos = squareToWorld(result.from);
        const toPos = squareToWorld(result.to);

        let victimSq = result.to;
        if (result.flags.includes('e')) {
            const file = result.to[0];
            const rank = result.color === 'w' ? '5' : '4';
            victimSq = file + rank;
        }
        const victimMesh = result.captured ? pieceMeshes[victimSq] : null;

        delete pieceMeshes[result.from];
        if (victimMesh && victimSq !== result.to) {
            delete pieceMeshes[victimSq];
        }
        pieceMeshes[result.to] = attackerMesh;

        let rookAnim = null;
        if (result.flags.includes('k') || result.flags.includes('q')) {
            const rank = result.color === 'w' ? '1' : '8';
            const rookFrom = result.flags.includes('k') ? ('h' + rank) : ('a' + rank);
            const rookTo = result.flags.includes('k') ? ('f' + rank) : ('d' + rank);
            const rMesh = pieceMeshes[rookFrom];
            if (rMesh) {
                delete pieceMeshes[rookFrom];
                pieceMeshes[rookTo] = rMesh;
                rookAnim = {
                    mesh: rMesh,
                    from: squareToWorld(rookFrom),
                    to: squareToWorld(rookTo)
                };
            }
        }

        const isCapture = Boolean(result.captured && victimMesh);
        const moveDir = new THREE.Vector3().subVectors(toPos, fromPos);
        const distance = moveDir.length();
        const normDir = moveDir.clone().normalize();

        const prevRadius = camState.targetRadius;
        if (isCapture && camState.battleCamEnabled) {
            camState.targetLookAt.copy(toPos).setY(0.6);
            camState.targetRadius = 11.8;
        }

        sfx.playStoneSlide(isCapture ? 0.48 : 0.56);

        activeChoreography = {
            result,
            attackerMesh,
            victimMesh,
            victimPos: squareToWorld(victimSq),
            fromPos,
            toPos,
            normDir,
            distance,
            isCapture,
            shattered: false,
            rookAnim,
            prevRadius,
            elapsed: 0,
            duration: isCapture ? 1.25 : 0.62
        };
    }

    function updateActiveChoreography(dt) {
        if (!activeChoreography) return;

        const c = activeChoreography;
        c.elapsed += dt;
        const t = Math.min(1, c.elapsed / c.duration);

        const upper = c.attackerMesh.userData.upperGroup;
        const weapon = c.attackerMesh.userData.weaponGroup;
        const isKnight = c.result.piece === 'n';
        const dirSign = c.result.color === 'w' ? -1 : 1;

        if (!c.isCapture) {
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            c.attackerMesh.position.lerpVectors(c.fromPos, c.toPos, ease);

            if (isKnight) {
                c.attackerMesh.position.y = TILE_TOP_Y + Math.sin(ease * Math.PI) * 1.45;
                upper.rotation.x = Math.sin(ease * Math.PI * 2) * 0.28 * dirSign;
            } else {
                c.attackerMesh.position.y = TILE_TOP_Y;
                upper.rotation.x = Math.sin(ease * Math.PI) * 0.14 * dirSign;
            }

            if (c.rookAnim) {
                c.rookAnim.mesh.position.lerpVectors(c.rookAnim.from, c.rookAnim.to, ease);
            }

        } else {
            const stopPoint = c.toPos.clone().addScaledVector(c.normDir, -0.88);

            if (t < 0.45) {
                const p1 = t / 0.45;
                const ease1 = 1 - Math.pow(1 - p1, 2);
                c.attackerMesh.position.lerpVectors(c.fromPos, stopPoint, ease1);
                if (isKnight) {
                    c.attackerMesh.position.y = TILE_TOP_Y + Math.sin(p1 * Math.PI) * 1.1;
                } else {
                    c.attackerMesh.position.y = TILE_TOP_Y;
                }
                upper.rotation.x = -p1 * 0.35 * dirSign;
                weapon.rotation.x = -p1 * 0.75 * dirSign;
                weapon.position.y += dt * 0.35;

            } else if (t < 0.60) {
                const p2 = (t - 0.45) / 0.15;
                upper.rotation.x = (-0.35 + p2 * 0.85) * dirSign;
                weapon.rotation.x = (-0.75 + p2 * 1.65) * dirSign;

                if (!c.shattered && p2 >= 0.45) {
                    c.shattered = true;
                    scene.remove(c.victimMesh);

                    if (c.result.color === 'w') {
                        whiteShatteredCount++;
                    } else {
                        blackShatteredCount++;
                    }

                    spawnPieceShatter(c.victimPos, c.victimMesh.userData.color, c.result.captured, c.normDir);
                    sfx.playShatterImpact();
                    triggerCameraShake(0.45);

                    impactLight.position.set(c.victimPos.x, 2.2, c.victimPos.z);
                    impactLight.color.setHex(c.result.color === 'w' ? 0xF59E0B : 0x8B5CF6);
                    impactLight.intensity = 6.5;

                    const pieceNames = { p: 'Pawn', r: 'Rook', n: 'Knight', b: 'Bishop', q: 'Queen', k: 'King' };
                    showToast(
                        `${c.result.color === 'w' ? 'Marble' : 'Obsidian'} ${pieceNames[c.result.piece]} shatters ${pieceNames[c.result.captured]}!`,
                        'bolt'
                    );
                }

            } else {
                const p3 = (t - 0.60) / 0.40;
                const ease3 = p3 < 0.5 ? 2 * p3 * p3 : 1 - Math.pow(-2 * p3 + 2, 2) / 2;
                c.attackerMesh.position.lerpVectors(stopPoint, c.toPos, ease3);
                c.attackerMesh.position.y = TILE_TOP_Y;

                upper.rotation.x = (1 - ease3) * 0.5 * dirSign;
                weapon.rotation.x = (1 - ease3) * 0.9 * dirSign;
            }
        }

        if (t >= 1) {
            c.attackerMesh.position.copy(c.toPos);
            c.attackerMesh.position.y = TILE_TOP_Y;
            upper.rotation.set(0, 0, 0);
            weapon.rotation.set(0, 0, 0);

            if (c.result.promotion) {
                scene.remove(c.attackerMesh);
                const promotedMesh = createSculptedPieceMesh(c.result.promotion, c.result.color);
                promotedMesh.position.copy(c.toPos);
                scene.add(promotedMesh);
                pieceMeshes[c.result.to] = promotedMesh;
                spawnDustShockwave(c.toPos, 0xF59E0B, 1.3);
            } else {
                spawnDustShockwave(c.toPos, c.result.color === 'w' ? 0xFDE68A : 0x8B5CF6, 0.65);
            }

            if (c.isCapture && camState.battleCamEnabled) {
                setTimeout(() => {
                    camState.targetLookAt.set(0, 0.4, 0);
                    camState.targetRadius = 17.2;
                }, 450);
            }

            isAnimatingMove = false;
            activeChoreography = null;

            updateSpatialIndicators();
            updateUIStatus();

            if (game.in_checkmate()) {
                sfx.playCheckAlert(true);
                showToast(`Checkmate! ${game.turn() === 'w' ? 'Obsidian' : 'Marble'} claims the Sanctuary!`, 'emoji_events');
            } else if (game.in_check()) {
                sfx.playCheckAlert(false);
                showToast(`${game.turn() === 'w' ? 'Marble' : 'Obsidian'} King is in Check!`, 'warning');
            }

            if (vsAI && !game.game_over() && game.turn() === 'b') {
                setTimeout(makeWizardAIMove, 420);
            }
        }
    }

    // ============================================================================
    // WIZARD AI OPPONENT
    // ============================================================================
    const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

    function evaluateBoardState(chessInstance) {
        const board = chessInstance.board();
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let f = 0; f < 8; f++) {
                const p = board[r][f];
                if (p) {
                    const centerBonus = (3.5 - Math.abs(3.5 - f)) * 4 + (3.5 - Math.abs(3.5 - r)) * 4;
                    const val = pieceValues[p.type] + centerBonus;
                    score += p.color === 'b' ? val : -val;
                }
            }
        }
        return score;
    }

    function makeWizardAIMove() {
        if (game.game_over() || isAnimatingMove) return;

        const legalMoves = game.moves({ verbose: true });
        if (legalMoves.length === 0) return;

        let bestMove = legalMoves[0];
        let bestScore = -Infinity;

        for (const move of legalMoves) {
            game.move(move);
            let score = -99999;

            if (game.in_checkmate()) {
                score = 999999;
            } else {
                const oppMoves = game.moves({ verbose: true });
                let worstReply = Infinity;
                if (oppMoves.length === 0) {
                    worstReply = 0;
                } else {
                    for (const reply of oppMoves) {
                        game.move(reply);
                        const evalScore = evaluateBoardState(game);
                        if (evalScore < worstReply) worstReply = evalScore;
                        game.undo();
                    }
                }
                score = worstReply;
            }

            if (move.captured) {
                score += pieceValues[move.captured] * 0.25;
            }
            score += (Math.random() - 0.5) * 14;

            game.undo();

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        executeChoreographedMove(bestMove);
    }

    function triggerStrikeMoveAction() {
        if (isAnimatingMove || game.game_over()) return;

        const legalMoves = game.moves({ verbose: true });
        const captureMoves = legalMoves.filter(m => m.captured);

        if (captureMoves.length > 0) {
            captureMoves.sort((a, b) => pieceValues[b.captured] - pieceValues[a.captured]);
            executeChoreographedMove(captureMoves[0]);
        } else {
            legalMoves.sort((a, b) => {
                const aRank = parseInt(a.to[1], 10);
                const bRank = parseInt(b.to[1], 10);
                return game.turn() === 'w' ? (bRank - aRank) : (aRank - bRank);
            });
            showToast('Advancing stone vanguard toward strike range...', 'bolt');
            executeChoreographedMove(legalMoves[0]);
        }
    }

    // ============================================================================
    // RAYCASTING & INTERACTIVE BOARD INPUT
    // ============================================================================
    const raycaster = new THREE.Raycaster();
    const mouseNDC = new THREE.Vector2();

    function getClickedSquare(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouseNDC, camera);

        const pieceRoots = Object.values(pieceMeshes);
        const pieceHits = raycaster.intersectObjects(pieceRoots, true);
        if (pieceHits.length > 0) {
            let obj = pieceHits[0].object;
            while (obj && obj.parent && obj.parent !== scene) {
                obj = obj.parent;
            }
            const foundSq = Object.keys(pieceMeshes).find(sq => pieceMeshes[sq] === obj);
            if (foundSq) return foundSq;
        }

        const sqHits = raycaster.intersectObjects(squareMeshes, false);
        if (sqHits.length > 0) {
            return sqHits[0].object.userData.square;
        }

        return null;
    }

    function handleSquareInteraction(sq) {
        if (!sq || isAnimatingMove || game.game_over()) return;
        if (vsAI && game.turn() === 'b') return;

        const matchingMoves = legalMovesForSelected.filter(m => m.to === sq);
        if (selectedSquare && matchingMoves.length > 0) {
            if (matchingMoves[0].flags.includes('p') || matchingMoves.some(m => m.promotion)) {
                pendingPromotionMove = { from: selectedSquare, to: sq };
                const promoModal = document.getElementById('promotion-modal');
                promoModal?.classList.remove('hidden');
                promoModal?.classList.add('flex');
                return;
            }

            executeChoreographedMove(matchingMoves[0]);
            return;
        }

        const pieceOnSq = game.get(sq);
        if (pieceOnSq && pieceOnSq.color === game.turn()) {
            if (selectedSquare === sq) {
                selectedSquare = null;
                legalMovesForSelected = [];
            } else {
                selectedSquare = sq;
                legalMovesForSelected = game.moves({ square: sq, verbose: true });
                sfx.playSelect(pieceOnSq.color === 'w');
            }
            updateSpatialIndicators();
        } else {
            selectedSquare = null;
            legalMovesForSelected = [];
            updateSpatialIndicators();
        }
    }

    canvas.addEventListener('pointerdown', (e) => {
        camState.isDragging = true;
        camState.prevMouse = { x: e.clientX, y: e.clientY };
        camState.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
        if (!camState.isDragging) return;
        const dx = e.clientX - camState.prevMouse.x;
        const dy = e.clientY - camState.prevMouse.y;
        camState.prevMouse = { x: e.clientX, y: e.clientY };

        if (Math.hypot(e.clientX - camState.pointerDownPos.x, e.clientY - camState.pointerDownPos.y) > 5) {
            camState.autoOrbit = false;
            camState.targetTheta -= dx * 0.0075;
            camState.targetPhi = Math.max(0.18, Math.min(1.38, camState.targetPhi - dy * 0.0065));
        }
    });

    window.addEventListener('pointerup', (e) => {
        if (!camState.isDragging) return;
        camState.isDragging = false;

        const moveDist = Math.hypot(e.clientX - camState.pointerDownPos.x, e.clientY - camState.pointerDownPos.y);
        if (moveDist < 6) {
            const clickedSq = getClickedSquare(e.clientX, e.clientY);
            handleSquareInteraction(clickedSq);
        }
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        camState.targetRadius = Math.max(9.5, Math.min(28.0, camState.targetRadius + e.deltaY * 0.012));
    }, { passive: false });

    // ============================================================================
    // UI CONTROLS & STATUS BINDINGS
    // ============================================================================
    function updateUIStatus() {
        const turn = game.turn();
        const turnPill = document.getElementById('turn-pill');
        const turnDot = document.getElementById('turn-dot');
        const turnText = document.getElementById('turn-text');
        const moveCounter = document.getElementById('move-counter');

        const moveNum = Math.floor(game.history().length / 2) + 1;
        if (moveCounter) moveCounter.textContent = `Move ${moveNum}`;

        const whiteCapEl = document.getElementById('white-captures');
        const blackCapEl = document.getElementById('black-captures');
        if (whiteCapEl) whiteCapEl.textContent = whiteShatteredCount;
        if (blackCapEl) blackCapEl.textContent = blackShatteredCount;

        if (!turnPill || !turnDot || !turnText) return;

        if (game.in_checkmate()) {
            turnText.textContent = turn === 'w' ? 'Obsidian Triumphs!' : 'Marble Triumphs!';
            turnDot.className = 'w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_#EF4444]';
            turnPill.className = 'flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/60 shadow-lg';
        } else if (game.in_draw() || game.in_stalemate()) {
            turnText.textContent = 'Sanctuary Stalemate';
            turnDot.className = 'w-2.5 h-2.5 rounded-full bg-slate-400';
        } else if (turn === 'w') {
            turnText.textContent = game.in_check() ? 'Marble (IN CHECK)' : "Marble's Turn";
            turnDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_#F59E0B] animate-pulse-glow';
            turnPill.className = 'flex items-center gap-2.5 px-3.5 md:px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/45 shadow-lg transition-all duration-300';
        } else {
            turnText.textContent = game.in_check() ? 'Obsidian (IN CHECK)' : (vsAI ? 'Wizard Thinking...' : "Obsidian's Turn");
            turnDot.className = 'w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_10px_#8B5CF6] animate-pulse-glow';
            turnPill.className = 'flex items-center gap-2.5 px-3.5 md:px-4 py-1.5 rounded-full bg-slate-900/90 border border-purple-500/45 shadow-lg transition-all duration-300';
        }
    }

    document.getElementById('btn-mode')?.addEventListener('click', () => {
        vsAI = !vsAI;
        const btn = document.getElementById('btn-mode');
        const label = document.getElementById('mode-label');
        const icon = document.getElementById('mode-icon');
        if (vsAI) {
            btn?.classList.add('active');
            if (label) label.textContent = 'vs Wizard AI';
            if (icon) icon.textContent = 'auto_awesome';
            showToast('Mode: Playing against the Cathedral Wizard AI', 'auto_awesome');
            if (!game.game_over() && game.turn() === 'b' && !isAnimatingMove) {
                setTimeout(makeWizardAIMove, 350);
            }
        } else {
            btn?.classList.remove('active');
            if (label) label.textContent = '2P Sanctuary';
            if (icon) icon.textContent = 'group';
            showToast('Mode: 2-Player Pass & Play enabled', 'group');
        }
        updateUIStatus();
    });

    document.getElementById('btn-demo-strike')?.addEventListener('click', () => {
        triggerStrikeMoveAction();
    });

    document.getElementById('btn-undo')?.addEventListener('click', () => {
        if (isAnimatingMove || game.history().length === 0) return;
        game.undo();
        if (vsAI && game.turn() === 'b' && game.history().length > 0) {
            game.undo();
        }
        selectedSquare = null;
        legalMovesForSelected = [];
        lastMoveSquares = [];
        syncBoardFromEngine();
        showToast('Previous command reversed in time', 'undo');
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
        if (isAnimatingMove) return;
        game.reset();
        selectedSquare = null;
        legalMovesForSelected = [];
        lastMoveSquares = [];
        whiteShatteredCount = 0;
        blackShatteredCount = 0;
        syncBoardFromEngine();
        setCameraPreset('white');
        showToast('All 32 stone statues restored to the Sanctuary', 'restart_alt');
    });

    document.getElementById('btn-sound')?.addEventListener('click', () => {
        sfx.enabled = !sfx.enabled;
        const btn = document.getElementById('btn-sound');
        const icon = document.getElementById('sound-icon');
        btn?.classList.toggle('active', sfx.enabled);
        if (icon) icon.textContent = sfx.enabled ? 'volume_up' : 'volume_off';
    });

    document.querySelectorAll('.cam-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setCameraPreset(btn.dataset.cam);
        });
    });

    document.getElementById('btn-battle-cam')?.addEventListener('click', (e) => {
        camState.battleCamEnabled = !camState.battleCamEnabled;
        e.currentTarget.classList.toggle('active', camState.battleCamEnabled);
        showToast(
            camState.battleCamEnabled ? 'Battle Cam enabled: Zooms onto captures' : 'Battle Cam disabled',
            'videocam'
        );
    });

    document.querySelectorAll('.promo-choice').forEach(btn => {
        btn.addEventListener('click', () => {
            const promoPiece = btn.dataset.promo;
            const promoModal = document.getElementById('promotion-modal');
            promoModal?.classList.add('hidden');
            promoModal?.classList.remove('flex');
            if (pendingPromotionMove) {
                executeChoreographedMove({
                    from: pendingPromotionMove.from,
                    to: pendingPromotionMove.to,
                    promotion: promoPiece
                });
                pendingPromotionMove = null;
            }
        });
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ============================================================================
    // MAIN RENDER & IDLE ANIMATION LOOP
    // ============================================================================
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);

        const dt = Math.min(clock.getDelta(), 0.1);
        const elapsedTime = clock.getElapsedTime();

        Object.values(pieceMeshes).forEach(mesh => {
            if (activeChoreography && activeChoreography.attackerMesh === mesh) return;

            const ud = mesh.userData;
            const phase = elapsedTime * 2.1 + ud.idlePhase;

            const targetHoverY = ud.isSelected
                ? (TILE_TOP_Y + 0.28 + Math.sin(elapsedTime * 5.0) * 0.06)
                : TILE_TOP_Y;
            mesh.position.y += (targetHoverY - mesh.position.y) * 0.15;

            ud.upperGroup.position.y = 0.38 + Math.sin(phase) * 0.022;
            ud.upperGroup.rotation.z = Math.cos(phase * 0.7) * 0.018;
            ud.weaponGroup.rotation.z = Math.sin(phase * 1.2) * 0.045;
        });

        Object.values(indicatorMeshes).forEach(ind => {
            if (ind.selRing.visible) {
                ind.selRing.rotation.z = elapsedTime * 0.8;
            }
            if (ind.capRing.visible) {
                ind.capRing.rotation.z = -elapsedTime * 1.6;
                const pulse = 1 + Math.sin(elapsedTime * 6) * 0.08;
                ind.capRing.scale.set(pulse, pulse, 1);
            }
            if (ind.moveRing.visible) {
                const pulse = 1 + Math.sin(elapsedTime * 4) * 0.1;
                ind.moveRing.scale.set(pulse, pulse, 1);
            }
        });

        const posAttr = dustGeo.attributes.position;
        for (let i = 0; i < dustCount; i++) {
            let y = posAttr.getY(i) + dt * 0.18;
            if (y > 13) y = -1;
            posAttr.setY(i, y);
        }
        posAttr.needsUpdate = true;

        if (impactLight.intensity > 0.01) {
            impactLight.intensity *= Math.exp(-8.0 * dt);
        } else {
            impactLight.intensity = 0;
        }

        updateActiveChoreography(dt);
        updateShatterPhysics(dt);
        updateCamera(dt);

        renderer.render(scene, camera);
    }

    syncBoardFromEngine();
    setCameraPreset('white');
    showToast('Select any carved Marble piece or click Strike Move', 'auto_fix_high');
    animate();
}
