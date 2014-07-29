var GP = GP || {};


(function () {

    'use strict';


    if (!Detector.webgl) Detector.addGetWebGLMessage();

    GP.Universe = function (container, config) {

        config = config || {};
        this.config.antialias = config.antialias || false;

        this.container = container;

        this.wallSize = 100;

        var init = function (container) {

            var scene, camera, cameraAnchor, renderer;

            var lights, wall, balls;

            // scene

            scene = new THREE.Scene();
            //scene.fog = new THREE.Fog(0xeeeeee, 1000, 3000);


            // camera

            camera = new THREE.PerspectiveCamera(45, container.innerWidth / container.innerHeight, 1, 500);
            // camera = new THREE.OrthographicCamera(-container.innerWidth / 2, container.innerWidth / 2, -container.innerHeight / 2, container.innerHeight / 2, 1, 500);
            camera.position.set(0, 0, 100);

            cameraAnchor = new THREE.Object3D();
            cameraAnchor.add(camera);

            scene.add(cameraAnchor);


            // lights

            lights = [];

            {
                var l;

                l = new THREE.AmbientLight(0xBBBBBB);
                lights.push(l);
                scene.add(l);

                l = new THREE.HemisphereLight(0x777777, 0, 0.1);
                l.position.set(0, 0, 500);
                lights.push(l);
                scene.add(l);

                // l = new THREE.PointLight(0xEEEEEE, 0.8, this.wallSize* 3);
                // l.position.set(-this.wallSize this.wallSize 2);
                // lights.push(l);
                // scene.add(l);

                l = new THREE.PointLight(0xEEEEEE, 0.8, this.wallSize * 3);
                l.position.set(this.wallSize, this.wallSize, 0);
                lights.push(l);
                scene.add(l);

                // l = new THREE.PointLight(0xEE0000, 0.9);
                // l.position.set(10, 10, 2);
                // lights.push(l);
                // scene.add(l);

            }


            // wall

            {
                // var g = new THREE.PlaneGeometry(this.wallSize, this.wallSize);

                // var m = new THREE.MeshPhongMaterial({
                //     color: 0xffffff
                // });

                // wall = new THREE.Mesh(g, m);
                // scene.add(wall);
            }


            // balls

            balls = [];

            window.setTimeout(this.initBalls.bind(this), 1);

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

            this.onCanvasResize(this.canvas.clientWidth, this.canvas.clientHeight);

        };


        this.initBalls = function () {

            var wallSize2 = this.wallSize / 2,
                radiusMin = this.wallSize * 0.05,
                radiusMax = this.wallSize * 0.20,
                posMax,
                segW = 30,
                segH = ~~ (segW * 0.7);

            var r = function (max) {
                    return (~~(Math.random() * max));
                },
                c = [0x0099CC, 0xAA66CC, 0x99CC00, 0xFFBB33, 0xFF4444], // colors
                cl = c.length - 1,
                cli = 0, // color cursor
                g, // temp geometry
                m, // temp material
                ball, // temp mesh
                radius, // temp radius
                pos; // temp pos

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

                return tries > 0 ? pos : null;

            }.bind(this);

            // avoid too many overlapping balls
            var validatePosition = function (radius, pos) {

                var other,
                    d,
                    a, b;

                for (var i = 0; i < this.balls.length; i++) {
                    other = this.balls[i];
                    if (other != undefined) {
                        a = Math.pow(other.position.x - pos.x, 2);
                        b = Math.pow(other.position.y - pos.y, 2);
                        d = Math.sqrt(a + b);

                        if (d < (other.radius + radius) * 0.75) return false;
                    }
                }

                //                     console.log(~~d, other?~~other.radius:null, ~~radius);

                return true;

            }.bind(this);

            for (var i = 0; i < 30; i++) {

                radius = r(radiusMax - radiusMin) + radiusMin;
                posMax = new THREE.Vector2(wallSize2, wallSize2);
                pos = newPos(radius);

                if (pos !== null) {

                    g = new THREE.SphereGeometry(radius, segW, segH, 0, Math.PI);

                    var color = c[++cli % (cl + 1)];

                    m = new THREE.MeshPhongMaterial({
                        ambient: color,
                        color: color,
                        // shading: THREE.FlatShading,
                        // specular: 0xbbbbbb,
                        shininess: 60,
                        metal: true
                    });

                    ball = new THREE.Mesh(g, m);
                    ball.radius = radius;
                    // ball.rotateX(0.5 * Math.PI);
                    ball.position.set(pos.x, pos.y, 0);
                    ball.name = "ball" + i;

                    this.balls.push(ball);
                    this.scene.add(ball);

                    //                         console.log("new: ball(%i, %i, %i) @%i:%i", radius, segW, segH, pos.x, pos.y);
                }
            }

            console.log(this.balls.length + " balls created.");

            this.initEvents();

        };

        this.initEvents = function () {

            this.picker = {
                camera: this.camera,

                width: this.container.clientWidth,
                height: this.container.clientHeight,
                widthHalf: this.container.clientWidth / 2,
                heightHalf: this.container.clientHeight / 2,

                targets: this.balls,

                projector: new THREE.Projector(),
                vector: new THREE.Vector3(),

                pickAt: function (x, y) {

                    this.vector.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1, 0);
                    this.projector.unprojectVector(this.vector, this.camera);

                    var ray = new THREE.Raycaster(this.camera.position, this.vector.sub(this.camera.position).normalize());
                    var intersects = ray.intersectObjects(this.targets);

                    if (intersects.length > 0) {

                    }
                },
            };

            // http://mwbrooks.github.io/thumbs.js/
            this.container.addEventListener('touchclick', this.onClick.bind(this), false);

        };

        this.onClick = function (e) {

            this.picker.pickAt(e.clientX, e.clientY);

        };

        this.onCanvasResize = function (w, h) {

            this.canvas.width = w;
            this.canvas.height = h;

            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(w, h);
        }.bind(this);

        this.startDate = Date.now();


        this.animate = function (time, delta) {

        };


        var lastTime = 0;

        this.render = (function () {

            var time = Date.now() - this.startDate,
                w = this.canvas.clientWidth,
                h = this.canvas.clientHeight;

            if (this.canvas.width != w || this.canvas.height != h) {
                this.onCanvasResize(w, h);
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