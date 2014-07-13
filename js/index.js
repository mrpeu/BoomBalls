var GP = GP || {};


(function () {

    'use strict';


    if (!Detector.webgl) Detector.addGetWebGLMessage();

    GP.Universe = function (container, config) {

        config = config || {};
        this.config.antialias = config.antialias || false;

        this.container = container;

        var init = function (container) {

            var scene, camera, cameraAnchor, renderer;

            var lights, wall, balls;

            var wallSize = 100;

            // scene

            scene = new THREE.Scene();
            //scene.fog = new THREE.Fog(0xeeeeee, 1000, 3000);


            // camera

            camera = new THREE.PerspectiveCamera(45, container.innerWidth / container.innerHeight, 1, 500);
            camera.position.set(0, 0, 100);

            cameraAnchor = new THREE.Object3D();
            cameraAnchor.add(camera);

            scene.add(cameraAnchor);


            // lights

            lights = [];

            {
                var l = new THREE.HemisphereLight(0xFFFFFF, 0);

                l.position.set(50, 50, 100);

                lights.push(l);
                scene.add(l);
            }


            // wall

            {
                var g = new THREE.PlaneGeometry(wallSize, wallSize);

                var m = new THREE.MeshBasicMaterial({
                    color: 0xffffff
                });

                wall = new THREE.Mesh(g, m);
                scene.add(wall);
            }


            // balls

            balls = [];

            {
                var radiusMin = wallSize * 0.05,
                    radiusMax = wallSize * 0.20,
                    segW = wallSize * 0.20,
                    segH = ~~ (segW * 0.7);

                var r = function (max) {
                        return (~~(Math.random() * max));
                    },
                    c = [0x0099CC, 0xAA66CC, 0x99CC00, 0xFFBB33, 0xFF4444],
                    cl = c.length,
                    g,
                    m,
                    ball,
                    radius,
                    pos, posMax = new THREE.Vector2(wallSize / 2 - radiusMax, wallSize / 2 - radiusMax);

                var newPos = function (radius) {

                    var pos = new THREE.Vector2(),
                        tries = 5;

                    do {
                        pos = new THREE.Vector2(
                            r(posMax.x) - posMax.x / 2,
                            r(posMax.y) - posMax.y / 2
                        );
                    }
                    while (!validatePosition(radius, pos) && tries-- > 0)

                    return pos;
                };

                // avoid too much overlapping balls
                var validatePosition = function (radius, pos) {

                    var b; // other ball

                    for (var i = 0; i < balls.length; i++) {
                        b = balls[i];

                        if (Math.abs(pos.x - b.position.x) > radius) return false;

                        if (Math.abs(pos.y - b.position.y) > radius) return false;
                    }

                    return true;
                };

                for (var i = 0; i < 10; i++) {
                    radius = r(radiusMax - radiusMin) + radiusMin;
                    pos = newPos(radius);

                    g = new THREE.SphereGeometry(radius, segW, segH);
                    m = new THREE.MeshLambertMaterial({
                        shading: THREE.FlatShading,
                        color: c[r(cl)]
                    });

                    ball = new THREE.Mesh(g, m);
                    ball.rotateX(0.5 * Math.PI);
                    ball.position.set(pos.x, pos.y, 0);
                    console.log(ball.position);

                    balls.push(ball);
                    scene.add(ball);

                    console.log("new: ball(%i, %i, %i) @%i:%i", radius, segW, segH, pos.x, pos.y);
                }

            }

            // renderer

            renderer = (function initRenderer(scene) {

                var renderer = new THREE.WebGLRenderer({
                    antialias: config.antialias,
                    alpha: true
                });

                // renderer.setClearColor(scene.fog.color, 1);

                renderer.setSize(container.clientWidth, container.clientHeight);

                return renderer;

            })(scene);



            this.scene = scene;
            this.camera = camera;
            this.cameraAnchor = cameraAnchor;
            this.lights = lights;
            this.wall = wall;
            this.balls = balls;
            this.renderer = renderer;

            container.appendChild(this.canvas = renderer.domElement);

            onCanvasResize.call(this, this.canvas.clientWidth, this.canvas.clientHeight);

        };

        var onCanvasResize = function (w, h) {

            this.canvas.width = w;
            this.canvas.height = h;

            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(w, h);
        };

        this.startDate = Date.now();


        this.animate = function (time, delta) {

        };


        var lastTime = 0;

        this.render = (function () {

            var time = Date.now() - this.startDate,
                w = this.canvas.clientWidth,
                h = this.canvas.clientHeight;

            if (this.canvas.width != w || this.canvas.height != h) {
                onCanvasResize.call(this, w, h);
            }

            this.renderer.render(this.scene, this.camera);

            this.animate(time, time - lastTime);

            lastTime = time;

            requestAnimationFrame(this.render);

        }).bind(this);


        init.call(this, container);

        return this;
    };

    GP.Universe.prototype = {

        constructor: GP.Universe,

        config: {},

        container: null,
        canvas: null,

        camera: null,
        cameraAnchor: null,
        scene: null,
        renderer: null,

        floor: null,
        lights: null,

        startDate: null,
        render: null
    };



})();

var uni = new GP.Universe(document.getElementById('container'));
uni.render();