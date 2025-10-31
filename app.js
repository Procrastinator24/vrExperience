// Конфигурация
const CONFIG = {
    MODEL_PATH: "./scene.glb", // Файл модели
    TEXTURE_PATH: "./grass.jpg" // Текстура травы
};
document.addEventListener("DOMContentLoaded", function() {
    const canvas = document.getElementById("renderCanvas");
    const loadingElement = document.getElementById("loading");
    const vrButton = document.getElementById("vrButton");

    // Создаем движок
    const engine = new BABYLON.Engine(canvas, true);

    // НЕ создаем сцену заранее - она создастся при загрузке модели
    let scene;
    let camera;
    let light;
    let groundMesh;
    let xrButton;

    // Загружаем модель используя LOAD
    loadingElement.textContent = "Загружаем модель...";

    BABYLON.SceneLoader.Load("./", CONFIG.MODEL_PATH, engine,
        function (newScene) {
            console.log("✅ Модель загружена через Load!");
            console.log("📦 Всего мешей в сцене:", newScene.meshes.length);

            // Сохраняем ссылку на сцену
            scene = newScene;

            // Показываем все меши для отладки
            scene.meshes.forEach((mesh, i) => {
                console.log(`📐 ${i}: ${mesh.name} - позиция: ${mesh.position.toString()}`);
            });

            // Теперь создаем камеру, свет и пол в ЗАГРУЖЕННОЙ сцене
            setupSceneAfterLoad();



            loadingElement.textContent = `✅ Модель загружена! Объектов: ${scene.meshes.length}`;

            // Включаем VR кнопку
            vrButton.style.display = "block";
            vrButton.textContent = "Войти в VR";
        },
        function (progress) {
            const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
            loadingElement.textContent = `Загрузка модели... ${percent}%`;
        },
        function (error) {
            console.error("❌ Ошибка загрузки:", error);
            loadingElement.textContent = "Ошибка загрузки модели: " + error.message;
            loadingElement.style.color = "red";
        }
    );

    // Функция настройки сцены ПОСЛЕ загрузки модели
    function setupSceneAfterLoad() {
        // Камера - UniversalCamera
        camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 1.6, -5), scene);
        camera.attachControl(canvas, true);
        camera.speed = 0.3;
        camera.angularSensibility = 2000;
        camera.minZ = 0.1;

        // Свет
        light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        light.intensity = 0.7;

        // Пол (для VR телепортации)
        const existingMesh = scene.getMeshByName("Cylinder.007")
        console.log(existingMesh.name)
        existingMesh.position.y = 0;
        existingMesh.scaling.x = 2.0;
        existingMesh.scaling.z = 2.0;
        existingMesh.isPickable = true;
        existingMesh.checkCollisions = true;
        existingMesh.refreshBoundingInfo();

        groundMesh = existingMesh

        const waterMaterial = new BABYLON.StandardMaterial("grassMat", scene)
        const waterTexture = new BABYLON.Texture(CONFIG.TEXTURE_PATH, scene); // текстура воды
        waterTexture.uScale = 10.0; // Масштаб текстуры
        waterTexture.vScale = 10.0;
        waterMaterial.diffuseTexture = waterTexture;



        groundMesh.material = waterMaterial;
        groundMesh.name = "grass";


        // Настраиваем камеру на модель
        setupCameraForModel();

        // Запускаем рендер
        engine.runRenderLoop(function() {
            scene.render();
        });

        window.addEventListener("resize", function() {
            engine.resize();
        });
    }

    // Функция настройки камеры для модели
    function setupCameraForModel() {
        const meshes = scene.meshes;
        if (meshes.length === 0) return;

        try {
            // Игнорируем пол и служебные меши
            const modelMeshes = meshes.filter(mesh =>
                mesh.name !== "grass" &&
                !mesh.name.includes("teleportation") &&
                !mesh.name.includes("rotationCone") &&
                mesh.getBoundingInfo
            );

            if (modelMeshes.length === 0) {
                console.warn("⚠️ Не найдено мешей модели для настройки камеры");
                return;
            }

            console.log("🎯 Настройка камеры для мешей:", modelMeshes.length);

            // Вычисляем общий bounding box
            let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
            let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);

            for (const mesh of modelMeshes) {
                const bbox = mesh.getBoundingInfo().boundingBox;
                min = BABYLON.Vector3.Minimize(min, bbox.minimumWorld);
                max = BABYLON.Vector3.Maximize(max, bbox.maximumWorld);
            }

            const center = min.add(max).scale(0.5);
            const size = max.subtract(min).scale(0.5);

            console.log("📍 Центр модели:", center.toString());
            console.log("📏 Размер модели:", size.toString());

            // Настраиваем камеру
            const modelSize = size.length();
            const cameraDistance = Math.max(modelSize * 1.5, 5);

            camera.position = new BABYLON.Vector3(
                center.x,
                center.y,
                center.z - cameraDistance
            );
            camera.setTarget(center);

            console.log("📷 Камера настроена");
            console.log("📍 Позиция камеры:", camera.position.toString());

        } catch (error) {
            console.warn("⚠️ Автонастройка камеры не удалась:", error);
            // Резервная настройка
            camera.position = new BABYLON.Vector3(0, 10, -10);
            camera.setTarget(BABYLON.Vector3.Zero());
        }
    }

    // VR функция
    vrButton.addEventListener("click", async function() {
        if (!scene) {
            loadingElement.textContent = "❌ Дождитесь загрузки модели";
            loadingElement.style.color = "red";
            return;
        }

        try {
            loadingElement.textContent = "Запускаем VR...";
            loadingElement.style.display = "block";
            vrButton.disabled = true;



            // Создаем VR опыт
            const xrHelper = await scene.createDefaultXRExperienceAsync({
                floorMeshes: [groundMesh],
                disableTeleportation: false,
                teleportationFloorMeshes: [groundMesh]
            });


            // Настраиваем телепортацию
            if (xrHelper.teleportation) {
                xrHelper.teleportation.addFloorMesh(groundMesh);
                console.log("📍 Телепортация настроена");
            }

            //setupVRCameraHeight();
            loadingElement.style.display = "none";
            vrButton.textContent = "VR активирован";
            xrButton = document.getElementsByClassName("babylonVRicon")

        } catch (error) {
            console.error("❌ Ошибка VR:", error);
            loadingElement.textContent = "Ошибка VR: " + error.message;
            loadingElement.style.color = "red";
            vrButton.disabled = false;
        }
    });



    xrButton.addEventListener("click", async function ()  {
        checkVRState();

    });
    function setupVRCameraHeight() {
        // В VR камера автоматически становится на уровень пола
        // Но можно дополнительно настроить:

        // 1. Убедимся что ground на правильной высоте
        groundMesh.position.y = 0;

        // 2. Настроим offset если нужно (редко требуется)
        if (scene.activeCamera && scene.activeCamera.position) {
            console.log("📏 Высота камеры в VR:", scene.activeCamera.position.y);
        }


    }
    // Проверить состояние VR и телепортации
    function checkVRState() {
        if (!scene.xr) {
            console.log("❌ XR не инициализирован");
            return;
        }

        const xr = scene.xr;
        console.log("🎮 XR состояние:", xr.baseExperience.state);
        console.log("📍 Телепортация доступна:", !!xr.teleportation);

        if (xr.teleportation) {
            console.log("🎯 Floor meshes:", xr.teleportation._floorMeshes);
            console.log("🔧 Teleportation enabled:", xr.teleportation.teleportationEnabled);
        }

        console.log("📏 Высота камеры:", scene.activeCamera.position.y);
    }
    window.checkVRState = checkVRState;
    console.log("🚀 Ожидаем загрузку модели...");
});
